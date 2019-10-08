const parser = require('body-parser');
const express = require('express');
const session = require('express-session');
const proxy = require('http-proxy-stream');
const WebAppStrategy = require("ibmcloud-appid").WebAppStrategy;
const passport = require('passport');

const CALLBACK_URL = '/ibm/cloud/appid/callback';
const PROXY_URL = process.env.SIDECAR_PROXY_URL || 'http://localhost:8080';
const PORT = process.env.SIDECAR_PORT || 3030;
const SESSION_SECRET = process.env.SIDECAR_SESSION_SECRET || 'lorem_ipsum_c3po_42';

const APPID_TENANTID = process.env.SIDECAR_APPID_TENANTID || '{tenantId}';
const APPID_CLIENTID = process.env.SIDECAR_APPID_CLIENTID || '{clientId}';
const APPID_SECRET = process.env.SIDECAR_APPID_SECRET || '{secret}';
const APPID_OAUTH_SERVERURL = process.env.SIDECAR_APPID_OAUTH_SERVERURL || '{oauthServerUrl}';
const APPID_APP_URL = process.env.SIDECAR_APP_URL || ('http://localhost:' + PORT);
const REDIRECT_URL = process.env.SIDECAR_REDIRECT_URL || APPID_APP_URL;

/*
 * Configure express
 */
const app = express();

app.set('trust proxy', 1);

/*
 * Passsport configuration for IBM Cloud App Id
 */
app.use(session({
    secret: SESSION_SECRET,
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new WebAppStrategy({
    tenantId: APPID_TENANTID,
    clientId: APPID_CLIENTID,
    secret: APPID_SECRET,
    oauthServerUrl: APPID_OAUTH_SERVERURL,
    redirectUri: APPID_APP_URL + CALLBACK_URL
}));

passport.serializeUser(function(user, cb) {
    cb(null, user);
});
   
passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

app.use(function(req, res, next) {
    next();
})

app.get(CALLBACK_URL, passport.authenticate(WebAppStrategy.STRATEGY_NAME));

/*
 * Routes of application
 */
app.get('/_userinfo', passport.authenticate(WebAppStrategy.STRATEGY_NAME), function (req, res) {
    res.json(req.user);
});

app.use(function (req, res) {
    proxy(req, { url: `${PROXY_URL}${req.originalUrl}` }, res);
});

app.use(function(err, req, res, next) {
    console.error(err.stack);
    next(err);
});

/*
 * Start server
 */
app.listen(PORT, function () {
    console.log('IBM Cloud App ID sidecar listening on port ' + PORT + '!');
});