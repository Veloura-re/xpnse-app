const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Config plugin to ensure proper C++ linking configuration.
 * React Native 0.81 requires NDK 27+ for std::format support.
 */

function withCppConfig(config) {
    // Ensure proper C++ STL configuration
    config = withGradleProperties(config, (config) => {
        // Ensure c++_shared is explicitly set
        const stlProperty = config.modResults.find(
            (item) => item.type === 'property' && item.key === 'android.stl'
        );

        if (!stlProperty) {
            config.modResults.push({
                type: 'property',
                key: 'android.stl',
                value: 'c++_shared',
            });
        }

        return config;
    });

    return config;
}

module.exports = withCppConfig;
