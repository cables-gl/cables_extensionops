op.require("fs");
const
    inPath = op.inString("Default Path", ""),
    exec = op.inTriggerButton("Select Directory"),
    outPath = op.outString("Path"),
    outTrigger = op.outTrigger("Next");

exec.onTriggered = () =>
{
    op.setUiError("dir", null);
    if (CABLES.UI)
    {
        CABLESUILOADER.talkerAPI.send("selectDir", { "dir": inPath.get() }, (err, dirName) =>
        {
            if (err) op.setUiError("dir", err);
            outPath.set(dirName || "");
            outTrigger.trigger();
        });
    }
};

