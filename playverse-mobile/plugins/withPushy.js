const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const SERVICE_NAME = 'me.pushy.sdk.PushyService';
const UPDATE_RECEIVER = 'me.pushy.sdk.PushyUpdateReceiver';
const BOOT_RECEIVER = 'me.pushy.sdk.PushyBootReceiver';

module.exports = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.application?.[0];
    if (!application) {
      return config;
    }

    application.service = application.service ?? [];
    if (!application.service.some((svc) => svc.$?.['android:name'] === SERVICE_NAME)) {
      application.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:exported': 'false',
        },
      });
    }

    application.receiver = application.receiver ?? [];
    if (
      !application.receiver.some((rec) => rec.$?.['android:name'] === UPDATE_RECEIVER)
    ) {
      application.receiver.push({
        $: {
          'android:name': UPDATE_RECEIVER,
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.PACKAGE_REPLACED' } },
            ],
            data: [{ $: { 'android:scheme': 'package' } }],
          },
        ],
      });
    }

    if (!application.receiver.some((rec) => rec.$?.['android:name'] === BOOT_RECEIVER)) {
      application.receiver.push({
        $: {
          'android:name': BOOT_RECEIVER,
          'android:exported': 'false',
          'android:permission': 'android.permission.RECEIVE_BOOT_COMPLETED',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.RESTART' } },
            ],
          },
        ],
      });
    }

    manifest['uses-permission'] = manifest['uses-permission'] ?? [];
    AndroidConfig.Manifest.addPermission(
      manifest,
      'android.permission.RECEIVE_BOOT_COMPLETED'
    );

    return config;
  });
};
