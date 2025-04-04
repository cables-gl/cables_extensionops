const
    exec = op.inTrigger("Trigger"),
    next = op.outTrigger("Next"),
    outPipe = op.outObject("Pipeline"),
    outShaderSrc = op.outString("Shader Source", "", "glsl"),
    outDefines = op.outArray("defines");

let compileCount = -1;
let oldShader = null;

exec.onTriggered = () =>
{
    outPipe.setRef(op.patch.cg.currentPipeDebug);

    const shader = op.patch.cg.getShader();
    if (oldShader != shader)
    {
        oldShader = shader;
        compileCount = -1;
    }

    if (shader)
    {
        if (shader.compileCount != compileCount)
        {
            compileCount = shader.compileCount;
            outShaderSrc.set(shader.getProcessedSource());
        }
        outDefines.set(shader.getDefines());
    }

    next.trigger();
};
