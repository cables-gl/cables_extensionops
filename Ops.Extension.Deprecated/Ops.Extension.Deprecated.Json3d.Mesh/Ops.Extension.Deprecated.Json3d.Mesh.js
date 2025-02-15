const render = op.inTrigger("render");
op.index = op.inValueInt("mesh index", 0);
const draw = op.inValueBool("draw", true);
const centerPivot = op.inValueBool("center pivot", false);

const next = op.outTrigger("next");
const geometryOut = op.outObject("geometry");

geometryOut.ignoreValueSerialize = true;

const cgl = op.patch.cgl;
let meshesCache = {};
let currentIndex = 0;

op.index.onChange = reload;
render.onTriggered = doRender;

function doRender()
{
    let idx = op.index.get();
    let mesh = meshesCache[idx];
    if (!mesh) reload();

    if (draw.get())
    {
        if (mesh) mesh.render(cgl.getShader());
    }
    next.trigger();
}

function reload()
{
    if (!cgl.frameStore.currentScene || !cgl.frameStore.currentScene.getValue()) return;
    let meshes = cgl.frameStore.currentScene.getValue().meshes;

    let mesh = null;

    const indx = op.index.get();

    if (cgl.frameStore.currentScene && cgl.frameStore.currentScene.getValue() && indx >= 0)
    {
        op.uiAttr({ "warning": "" });
        op.uiAttr({ "info": "" });

        let jsonMesh = null;

        currentIndex = indx;

        if (CABLES.isNumeric(indx))
        {
            if (indx < 0 || indx >= cgl.frameStore.currentScene.getValue().meshes.length)
            {
                op.uiAttr({ "warning": "mesh not found - index out of range " });
                return;
            }

            jsonMesh = cgl.frameStore.currentScene.getValue().meshes[parseInt(indx, 10)];
        }

        if (!jsonMesh)
        {
            mesh = null;
            op.uiAttr({ "warning": "mesh not found" });
            return;
        }
        op.uiAttribs.warning = "";

        let geom = CGL.Geometry.json2geom(jsonMesh);
        // var geom=new CGL.Geometry();
        // geom.vertices=(jsonMesh.vertices||[]).slice();
        // geom.vertexNormals=jsonMesh.normals||[];
        // geom.tangents=jsonMesh.tangents||[];
        // geom.biTangents=jsonMesh.bitangents||[];

        if (centerPivot.get()) geom.center();

        if (jsonMesh.texturecoords) geom.texCoords = jsonMesh.texturecoords[0];
        // geom.verticesIndices=[];

        // for(var i=0;i<jsonMesh.faces.length;i++)
        // {
        //    geom.verticesIndices.push(jsonMesh.faces[i][0],jsonMesh.faces[i][1],jsonMesh.faces[i][2]);
        // }
        // geom.verticesIndices=[].concat.apply([], jsonMesh.faces);

        // var nfo='';
        // nfo += (geom.verticesIndices.length/3)+' faces <br/>';
        // nfo += (geom.vertices.length/3)+' vertices <br/>';
        // nfo += geom.texCoords.length+' texturecoords <br/>';
        // nfo += geom.tangents.length+' tangents <br/>';
        // nfo += geom.biTangents.length+' biTangents <br/>';
        // if(geom.vertexNormals) nfo += geom.vertexNormals.length+' normals <br/>';

        // op.uiAttr({"info":nfo});

        // var
        // indices = geom.verticesIndices || [],
        // faces = jsonMesh.faces,
        // face, i
        // ;

        // if(faces)
        //     for(i = 0; i < faces.length; i++) {
        //         face=jsonMesh.faces[i];
        //         Array.prototype.push.apply(indices, face);
        //     }

        let nfo = "";
        nfo += (geom.verticesIndices.length / 3) + " faces <br/>";
        nfo += (geom.vertices.length / 3) + " vertices <br/>";
        nfo += (geom.texCoords ? geom.texCoords.length / 2 : "no") + " texturecoords <br/>";
        nfo += geom.vertexNormals.length / 3 + " normals <br/>";
        nfo += geom.tangents.length / 3 + " tangents <br/>";
        nfo += geom.biTangents.length / 3 + " biTangents <br/>";
        op.uiAttr({ "info": nfo });

        geometryOut.set(null);
        geometryOut.set(geom);
        mesh = new CGL.Mesh(cgl, geom);
        meshesCache[indx] = mesh;
    }
}

centerPivot.onChange = function ()
{
    // todo: dispose meshes
    meshesCache = {};
};
