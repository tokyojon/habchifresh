const express = require('express');
const { XeroClient } = require('xero-node');
const { createClient } = require('@supabase/supabase-js');
const session = require('express-session');

const app = express();

// Basic session setup to store authentication state
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [process.env.XERO_REDIRECT_URI],
    scopes: 'openid profile email accounting.transactions accounting.settings offline_access'.split(" "),
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Router for Netlify functions
const router = express.Router();

router.get('/', (req, res) => {
    res.send('<h2>Xero Supabase App</h2><a href="/api/connect">Connect to Xero</a>');
});

router.get('/connect', async (req, res) => {
    try {
        const consentUrl = await xero.buildConsentUrl();
        res.redirect(consentUrl);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error initiating Xero auth');
    }
});

router.get('/callback', async (req, res) => {
    try {
        // xero-node expects the full url to parse params
        // We construct the full URL since req.url might be just the path
        const protocol = req.protocol;
        const host = req.get('host');
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;

        // We need to fetch the token
        const tokenSet = await xero.apiCallback(fullUrl);

        // Update the client with the new token
        await xero.updateTenants();

        const activeTenant = xero.tenants[0];

        // Save token to Supabase
        // Assuming a table 'xero_tokens' exists. 
        // You might want to link this to a user in a real app.
        const { data, error } = await supabase
            .from('xero_tokens')
            .upsert({
                id: 1, // Single user mode for demo
                token_set: tokenSet,
                tenant_id: activeTenant.tenantId,
                updated_at: new Date()
            });

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).send('Error saving to Supabase');
        }

        res.send(`
      <h3>Connected to Xero!</h3>
      <p>Tenant ID: ${activeTenant.tenantId}</p>
      <p>Token saved to Supabase.</p>
      <pre>${JSON.stringify(tokenSet, null, 2)}</pre>
    `);
    } catch (err) {
        console.error(err);
        res.status(500).send(`Error in callback: ${err.message}`);
    }
});

// Mount the router at /api/ (or / if you prefer, but netlify function usually maps to a path)
// In netlify function wrapper, we usually strip the prefix if using express router nicely
// or just attach to app.
app.use('/api', router); // Matches the redirects in netlify.toml

// Fallback for direct testing if running node src/app.js directly
app.get('/test', (req, res) => res.send('Test'));

module.exports = app;
