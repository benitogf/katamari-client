import { Base64 } from 'js-base64'
import ky from 'ky'


class SamoBase {
    constructor(address) {
        this.address = address;
    }
    decode = (evt) => {
        const msg = Base64.decode(JSON.parse(evt.data).data)
        const data = msg !== '' ? JSON.parse(msg) : { created: 0, updated: 0, index: '', data: 'e30=' }
        const mode = evt.currentTarget.url.replace('ws://' + this.address + '/', '').split('/')[0]
        return this._decode(mode, data)
    }

    _decode = (mode, data) => (mode === 'sa') ? Object.assign(data, { data: JSON.parse(Base64.decode(data['data'])) }) :
        Array.isArray(data) ?
            data.map((obj) => {
                obj['data'] = JSON.parse(Base64.decode(obj['data']))
                return obj
            }) : []

    encode = (data, index) => JSON.stringify({
        data: Base64.encode(JSON.stringify(data)),
        index
    })

    rstats = async (optionalAddress) => {
        const res = await ky.get(
            'http://' + ((optionalAddress) ? optionalAddress : this.address)).json();

        return res
    }

    rget = async (mode, key, optionalAddress) => {
        const data = await ky.get(
            'http://' + ((optionalAddress) ? optionalAddress : this.address) + '/r/' + mode + '/' + key).json();
        return this._decode(mode, data)
    }

    rpost = async (mode, key, data, optionalIndex, optionalAddress) => {
        const res = await ky.post(
            'http://' + ((optionalAddress) ? optionalAddress : this.address) + '/r/' + mode + '/' + key,
            {
                json: {
                    index: optionalIndex,
                    data: Base64.encode(JSON.stringify(data))
                }
            }
        ).json();

        return res.index
    }

    rdel = async (key, optionalAddress) => {
        return ky.delete(
            'http://' +
            ((optionalAddress) ? optionalAddress : this.address) +
            '/r/' + key);
    }

    parseTime = (evt) => parseInt(JSON.parse(evt.data).data)
}

export default SamoBase;