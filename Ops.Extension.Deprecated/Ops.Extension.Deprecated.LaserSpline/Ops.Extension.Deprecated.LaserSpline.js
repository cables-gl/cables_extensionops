// Op.apply(this, arguments);
let self = this;
let cgl = this.patch.cgl;
cglframeStoreSplinePoints = [];

this.name = "LaserSpline";
this.render = this.addInPort(new CABLES.Port(this, "render", CABLES.OP_PORT_TYPE_FUNCTION));

this.thickness = this.addInPort(new CABLES.Port(this, "thickness", CABLES.OP_PORT_TYPE_VALUE));
this.thickness.val = 1.0;

this.centerpoint = this.addInPort(new CABLES.Port(this, "centerpoint", CABLES.OP_PORT_TYPE_VALUE, { "display": "bool" }));
this.centerpoint.val = false;

this.trigger = this.addOutPort(new CABLES.Port(this, "trigger", CABLES.OP_PORT_TYPE_FUNCTION));
this.triggerPoints = this.addOutPort(new CABLES.Port(this, "triggerPoints", CABLES.OP_PORT_TYPE_FUNCTION));

let outObj = this.addOutPort(new CABLES.Port(this, "json", CABLES.OP_PORT_TYPE_ARRAY));

let outNumPoints = this.addOutPort(new CABLES.Port(this, "numPoints", CABLES.OP_PORT_TYPE_VALUE));

let fov = this.addInPort(new CABLES.Port(this, "fov", CABLES.OP_PORT_TYPE_VALUE));
let w = this.addInPort(new CABLES.Port(this, "w", CABLES.OP_PORT_TYPE_VALUE));
let h = this.addInPort(new CABLES.Port(this, "h", CABLES.OP_PORT_TYPE_VALUE));

let coordmul = this.addInPort(new CABLES.Port(this, "mul", CABLES.OP_PORT_TYPE_VALUE));
let coordClamp = this.addInPort(new CABLES.Port(this, "clamp", CABLES.OP_PORT_TYPE_VALUE));

let colorMul = this.addInPort(new CABLES.Port(this, "color intensity", CABLES.OP_PORT_TYPE_VALUE));
colorMul.set(1.0);
let buffer = cgl.gl.createBuffer();

let hue = this.addInPort(new CABLES.Port(this, "hue", CABLES.OP_PORT_TYPE_VALUE));
colorMul.set(1.0);

let showR = this.addInPort(new CABLES.Port(this, "show r", CABLES.OP_PORT_TYPE_VALUE, { "display": "bool" }));
let showG = this.addInPort(new CABLES.Port(this, "show g", CABLES.OP_PORT_TYPE_VALUE, { "display": "bool" }));
let showB = this.addInPort(new CABLES.Port(this, "show b", CABLES.OP_PORT_TYPE_VALUE, { "display": "bool" }));

function easeSmoothStep(perc)
{
    let x = Math.max(0, Math.min(1, (perc - 0) / (1 - 0)));
    perc = x * x * (3 - 2 * x); // smoothstep
    return perc;
}

function easeSmootherStep(perc)
{
    let x = Math.max(0, Math.min(1, (perc - 0) / (1 - 0)));
    perc = x * x * x * (x * (x * 6 - 15) + 10); // smootherstep
    return perc;
}

let laserObj = [];
let stride = 6;

this.render.onTriggered = function ()
{
    if (!cglframeStorelaserPoints)cglframeStorelaserPoints = [];
    let shader = cgl.getShader();
    self.trigger.trigger();

    if (!shader) return;
    bufferData();

    cgl.pushModelMatrix();
    mat4.identity(cgl.mvMatrix);

    if (mesh) mesh.render(cgl.getShader());

    function project(vec, viewWidth, viewHeight, fov, viewDistance)
    {
        let v = vec3.create();
        let factor, x, y;
        factor = fov / (viewDistance + vec[2]);
        x = vec[0] * factor + viewWidth / 2;
        y = vec[1] * factor + viewHeight / 2;
        vec3.set(v, x, y, 0);
        return v;
    }

    let minX = 9999999;
    let maxX = -9999999;
    let minY = 9999999;
    let maxY = -9999999;

    let lastR = 0;
    let lastG = 0;
    let lastB = 0;

    let numPoints = 0;
    for (var i = 0; i < cglframeStorelaserPoints.length; i++)
    {
        numPoints += parseInt(Math.abs(cglframeStorelaserPoints[i].num), 10);
    }
    laserObj.length = numPoints * stride;

    let ind = 0;
    let lastX = 0;
    let lastY = 0;
    let addBlack = false;

    for (var i = 0; i < cglframeStorelaserPoints.length; i++)
    {
        let vec = [0, 0, 0];
        vec3.set(vec, cglframeStorelaserPoints[i].x, cglframeStorelaserPoints[i].y, cglframeStorelaserPoints[i].z);

        cgl.pushModelMatrix();
        mat4.translate(cgl.mvMatrix, cgl.mvMatrix, vec);
        self.triggerPoints.trigger();
        cgl.popModelMatrix();

        let point = [
            cglframeStorelaserPoints[i].x,
            cglframeStorelaserPoints[i].y,
            cglframeStorelaserPoints[i].z];

        let vv = project(point, w.get(), h.get(), fov.get(), 0.01);// viewWidth, viewHeight, fov, viewDistance)

        for (let ni = 0; ni < Math.abs(cglframeStorelaserPoints[i].num); ni++)
        {
            var x = Math.round(-1 * vv[0] * coordmul.get());
            var y = Math.round(-1 * vv[1] * coordmul.get());

            let clamped = false;
            if (x > coordClamp.get())
            {
                clamped = true;
                x = coordClamp.get();
            }
            if (y > coordClamp.get())
            {
                clamped = true;
                y = coordClamp.get();
            }
            if (x < 0 - coordClamp.get())
            {
                clamped = true;
                x = 0 - coordClamp.get();
            }
            if (y < 0 - coordClamp.get())
            {
                clamped = true;
                y = 0 - coordClamp.get();
            }

            if (addBlack)
            {
                for (let nn = 0; nn < 2; nn++)
                {
                    laserObj[ind * stride + 0] = x;
                    laserObj[ind * stride + 1] = y;
                    laserObj[ind * stride + 2] = 0;
                    laserObj[ind * stride + 3] = 0;
                    laserObj[ind * stride + 4] = 0;
                    laserObj[ind * stride + 5] = 0;
                    ind++;
                }

                addBlack = false;
            }

            minX = Math.min(x, minX);
            maxX = Math.max(x, maxX);

            minY = Math.min(y, minY);
            maxY = Math.max(y, maxY);

            laserObj[ind * stride + 0] = x;
            laserObj[ind * stride + 1] = y;
            laserObj[ind * stride + 2] = 0;

            if (cglframeStorelaserPoints[i].hasOwnProperty("colR"))
            {
                cglframeStorelaserPoints[i].colR *= colorMul.get();
                lastR = cglframeStorelaserPoints[i].colR;
            }
            else cglframeStorelaserPoints[i].colR = lastR;

            if (cglframeStorelaserPoints[i].hasOwnProperty("colG"))
            {
                cglframeStorelaserPoints[i].colG *= colorMul.get();
                lastG = cglframeStorelaserPoints[i].colG;
            }
            else cglframeStorelaserPoints[i].colG = lastG;

            if (cglframeStorelaserPoints[i].hasOwnProperty("colB"))
            {
                cglframeStorelaserPoints[i].colB *= colorMul.get();
                lastB = cglframeStorelaserPoints[i].colB;
            }
            else cglframeStorelaserPoints[i].colB = lastB;

            laserObj[ind * stride + 3] = cglframeStorelaserPoints[i].colR * 255;// parseInt((cglframeStorelaserPoints[i].colR || lastR)*255*colorMul.get(),10);
            laserObj[ind * stride + 4] = cglframeStorelaserPoints[i].colG * 255;// parseInt((cglframeStorelaserPoints[i].colG || lastG)*255*colorMul.get(),10);
            laserObj[ind * stride + 5] = cglframeStorelaserPoints[i].colB * 255;// parseInt((cglframeStorelaserPoints[i].colB || lastB)*255*colorMul.get(),10);

            if (!showR.get()) laserObj[ind * stride + 3] = 0;
            if (!showG.get()) laserObj[ind * stride + 4] = 0;
            if (!showB.get()) laserObj[ind * stride + 5] = 0;

            if (clamped)
            {
                laserObj[ind * stride + 3] = 0;
                laserObj[ind * stride + 4] = 0;
                laserObj[ind * stride + 5] = 0;
            }

            ind++;
        }
        if (cglframeStorelaserPoints[i].hasOwnProperty("black")) addBlack = true;

        lastX = x;
        lastY = y;
    }

    laserObj.push(lastX);
    laserObj.push(lastY);
    laserObj.push(0);
    laserObj.push(0);
    laserObj.push(0);
    laserObj.push(0);

    laserObj.push(lastX);
    laserObj.push(lastY);
    laserObj.push(0);
    laserObj.push(0);
    laserObj.push(0);
    laserObj.push(0);

    // console.log('minmax',minX,maxX,minY,maxY);

    outNumPoints.set(ind);
    cgl.popModelMatrix();
    cglframeStorelaserPoints.length = 0;
    outObj.set(null);
    outObj.set(laserObj);
};

var mesh = null;
let geom = new CGL.Geometry();

function bufferData()
{
    if (!cglframeStorelaserPoints)cglframeStorelaserPoints = [];
    let verts = [];
    let indices = [];
    let vertsColors = [];

    let colR = 0;
    let colG = 0;
    let colB = 0;
    let addBlack = false;
    let index = 0;
    for (let i = 0; i < cglframeStorelaserPoints.length; i++)
    {
        // other point
        verts.push(cglframeStorelaserPoints[i].x);
        verts.push(cglframeStorelaserPoints[i].y);
        verts.push(cglframeStorelaserPoints[i].z);

        if (cglframeStorelaserPoints[i].hasOwnProperty("colR"))
            colR = cglframeStorelaserPoints[i].colR;

        if (cglframeStorelaserPoints[i].hasOwnProperty("colG"))
            colG = cglframeStorelaserPoints[i].colG;

        if (cglframeStorelaserPoints[i].hasOwnProperty("colB"))
            colB = cglframeStorelaserPoints[i].colB;

        if (addBlack)
        {
            addBlack = false;

            vertsColors.push(0);
            vertsColors.push(0);
            vertsColors.push(0);
            vertsColors.push(1);

            verts.push(cglframeStorelaserPoints[i].x);
            verts.push(cglframeStorelaserPoints[i].y);
            verts.push(cglframeStorelaserPoints[i].z);

            indices[index] = index;
            index++;
        }

        vertsColors.push(colR);
        vertsColors.push(colG);
        vertsColors.push(colB);
        vertsColors.push(1);

        if (cglframeStorelaserPoints[i].hasOwnProperty("black"))
        {
            addBlack = true;
        }

        indices[index] = index;
        index++;
    }

    cglframeStoreSplinePoints = verts;

    geom.vertices = verts;
    geom.vertexColors = vertsColors;
    geom.verticesIndices = indices;

    if (!mesh) mesh = new CGL.Mesh(cgl, geom, cgl.gl.LINE_STRIP);
    mesh.setGeom(geom);
}

bufferData();
