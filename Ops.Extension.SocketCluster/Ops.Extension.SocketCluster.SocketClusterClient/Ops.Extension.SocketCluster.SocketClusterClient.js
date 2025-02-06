const serverHostname = op.inString("server hostname", "");
const serverPath = op.inString("server path", "/socketcluster/");
const serverPort = op.inValue("server port", 443);
const serverSecure = op.inBool("use ssl", true);
const allowSend = op.inBool("allow send", false);
const allowMultipleSenders = op.inBool("allow multiple senders", false);
const channelName = op.inString("channel", CABLES.generateUUID());
const globalDelay = op.inInt("delay send (ms)", 0);
const commonValues = op.inObject("Additional serverdata", {});
const ready = op.outBool("ready", false);
const socketOut = op.outObject("socket", null, "socketcluster");
const clientIdOut = op.outString("own client id");
const sendOut = op.outBool("can send", false);
const errorOut = op.outObject("error", null);

let socket = null;
let initDelay = null;

const init = () =>
{
    if (!initDelay)
    {
        initDelay = setTimeout(() =>
        {
            errorOut.set(null);
            if (socket)
            {
                socket.disconnect();
                socket = null;
            }
            socket = socketClusterClient.create({
                "hostname": serverHostname.get(),
                "secure": serverSecure.get(),
                "port": serverPort.get(),
                "path": serverPath.get()
            });
            socket.allowSend = allowSend.get();
            socket.channelName = channelName.get();
            socket.globalDelay = globalDelay.get();
            socket.commonValues = commonValues.get() || {};
            sendOut.set(allowSend.get());
            clientIdOut.set(socket.clientId);

            (async () =>
            {
                for await (const { error } of socket.listener("error"))
                {
                    op.setUiError("connectionError", `error in socketcluster connection (${error.name})`, 2);
                    op.logError(error);
                    errorOut.set(error);
                    ready.set(false);
                }
            })();
            (async () =>
            {
                for await (const event of socket.listener("connect"))
                {
                    op.setUiError("connectionError", null);
                    ready.set(true);
                    socketOut.set(socket);
                }
            })();
            serverHostname.onChange = init;
            serverPort.onChange = init;
            serverSecure.onChange = init;
            initDelay = null;
        }, 1000);
    }
};

globalDelay.onChange = () =>
{
    if (socket)
    {
        socket.globalDelay = globalDelay.get();
        socketOut.set(socket);
    }
};

allowSend.onChange = () =>
{
    if (socket)
    {
        socket.allowSend = allowSend.get();
        socketOut.set(socket);
        sendOut.set(allowSend.get());
        const payload = Object.assign(socket.commonValues, { "topic": "cablescontrol", "clientId": socket.clientId, "payload": { "allowSend": allowSend.get() } });
        socket.transmitPublish(channelName.get() + "/control", payload);
    }
};

channelName.onChange = () =>
{
    if (socket)
    {
        socket.channelName = channelName.get();
        socketOut.set(socket);

        // subscribe to controllmessages for this channel
        (async () =>
        {
            const channel = socket.subscribe(channelName.get() + "/control");
            for await (const obj of channel)
            {
                if (obj.clientId != socket.clientId)
                {
                    handleControlMessage(obj);
                }
            }
        })();
    }
};

commonValues.onChange = () =>
{
    if (socket)
    {
        socket.commonValues = commonValues.get() || {};
        socketOut.set(socket);
    }
};

const handleControlMessage = (message) =>
{
    // other client wants to take over control, switch state if multiple senders are not allowed
    if (message.payload.allowSend && !allowMultipleSenders.get())
    {
        socket.allowSend = false;
        socketOut.set(socket);
        sendOut.set(false);
    }
};

op.init = init;
serverHostname.onChange = serverPath.onChange = serverPort.onChange = serverSecure.onChange = init;
