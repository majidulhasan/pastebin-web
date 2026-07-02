const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.serveRawPaste = functions.https.onRequest(async (req, res) => {
    const pathParts = req.path.split('/');
    const pasteId = pathParts[pathParts.length - 1];

    if (!pasteId) {
        res.status(400).send("Bad Request: Missing Paste ID");
        return;
    }

    try {
        const snapshot = await admin.database().ref(`pastes/${pasteId}`).once('value');
        if (!snapshot.exists()) {
            res.status(404).send("Error: Paste not found");
            return;
        }

        const paste = snapshot.val();

        if (paste.visibility === "PRIVATE") {
            res.status(403).send("Forbidden: This paste is set to private.");
            return;
        }

        if (paste.expireTime && paste.expireTime < Date.now()) {
            res.status(410).send("Expired: This paste has reached its expiration limit.");
            return;
        }

        if (paste.passwordProtected) {
            res.status(401).send("Unauthorized: Password protected pastes can only be viewed in the client application.");
            return;
        }

        if (paste.burnAfterRead) {
            await admin.database().ref(`pastes/${pasteId}`).remove();
        }

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.status(200).send(paste.code);

    } catch (error) {
        res.status(500).send("Internal Server Database Error: " + error.message);
    }
});
