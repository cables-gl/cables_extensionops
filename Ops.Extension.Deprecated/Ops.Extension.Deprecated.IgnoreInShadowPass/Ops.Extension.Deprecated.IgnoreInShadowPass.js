let exe = op.inTrigger("exec");
let next = op.outTrigger("Next");

exe.onTriggered = function ()
{
    if (!op.patch.cgl.frameStore.shadowPass)
    {
        next.trigger();
    }
};