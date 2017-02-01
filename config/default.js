// https://github.com/lorenwest/node-config

/* Create a local config file to override some values
    module.exports = {
        port: process.env.port || 60000,
        sessionSecret: '1234567890'
        credentials: {
            clientID: '1234567890',
            audience: '1234567890'
        },
        issuer: [
          '1234567890',
          '1234567890'
        ]
    }
*/


module.exports = {
    appName: 'azure-ad-webclient',
    env: process.env.NODE_ENV || 'development',
    port: process.env.port || 8080,
    host: 'localhost',
    loggingLevel: 'info',
    sessionSecret: '*** Do not past here.  Put in local file and DO NOT COMMIT.  ***',
    // https://github.com/AzureAD/passport-azure-ad
    // validateIssuer should be true for prod
    credentials: {
        clientID: '*** Do not past here.  Put in local file and DO NOT COMMIT.  ***',
        identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
        passReqToCallback: false,
        validateIssuer: true,
        issuer: [
          '*** Do not past here.  Put in local file and DO NOT COMMIT.  ***',
          '*** Do not past here.  Put in local file and DO NOT COMMIT.  ***'
        ],
        loggingLevel: 'info'
    }
}
