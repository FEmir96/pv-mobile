// convex/functions/mutations/updateUser.ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";

const DEFAULT_STATUS = "Activo";

export const updateUser = mutation({
  args: {
    requesterId: v.id("profiles"),                 // debe ser admin
    userId: v.id("profiles"),                      // usuario a modificar
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("free"), v.literal("premium"), v.literal("admin"))
    ),
    status: v.optional(v.union(v.literal("Activo"), v.literal("Baneado"))),
  },
  handler: async ({ db }, { requesterId, userId, name, email, role, status }) => {
    // 1) Permisos
    const requester = await db.get(requesterId);
    if (!requester || requester.role !== "admin") {
      throw new Error("No autorizado. Solo admin puede actualizar usuarios.");
    }

    // 2) Usuario objetivo
    const user = await db.get(userId);
    if (!user) throw new Error("Usuario no encontrado.");

    // 3) Preparar cambios con validaciones
    const updates: Record<string, unknown> = {};
    const beforeSnapshot: Record<string, unknown> = {};
    const afterSnapshot: Record<string, unknown> = {};

    if (name !== undefined && name !== user.name) {
      updates.name = name;
      beforeSnapshot.name = user.name;
      afterSnapshot.name = name;
    }

    if (email !== undefined && email !== user.email) {
      // Validar unicidad de email
      const dupe = await db
        .query("profiles")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (dupe && String(dupe._id) !== String(userId)) {
        throw new Error(`El email "${email}" ya esta en uso por otro usuario.`);
      }
      updates.email = email;
      beforeSnapshot.email = user.email;
      afterSnapshot.email = email;
    }

    if (role !== undefined && role !== user.role) {
      updates.role = role;
      beforeSnapshot.role = user.role;
      afterSnapshot.role = role;
    }

    const currentStatus = (user as any).status ?? DEFAULT_STATUS;
    if (status !== undefined && status !== currentStatus) {
      updates.status = status;
      beforeSnapshot.status = currentStatus;
      afterSnapshot.status = status;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No hay cambios para aplicar.");
    }

    // 4) Aplicar cambios
    await db.patch(userId, updates);

    // 5) Auditoria
    await db.insert("audits", {
      action: "update_user",
      entity: "user",
      entityId: userId, // <-- PASAMOS LA Id (NO string)
      requesterId,
      timestamp: Date.now(),
      details: {
        requesterName: requester.name,
        userEmail: user.email,
        changes: {
          before: beforeSnapshot,
          after: afterSnapshot,
        },
      },
    });

    return { updated: true, userId, changes: updates };
  },
});
