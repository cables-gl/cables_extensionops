const exe = op.inTriggerButton("exe"),
    array = op.inArray("array"),
    index = op.inValueInt("index"),
    value = op.inArray("new Array"),
    values = op.outArray("values");

values.ignoreValueSerialize = true;

function updateIndex()
{
    if (exe.isLinked()) return;
    update();
}

function copyArray(source)
{
    let dest = [];
    dest.length = source.length;
    for (let i = 0, n = source.length; i < n; i++) dest[i] = source[i];

    return dest;
}

function update()
{
    if (!array.get() || !value.get()) return;
    array.get()[index.get()] = copyArray(value.get());

    values.set(null);
    values.set(array.get());
}

exe.onTriggered = update;
