const mongoose = require('mongoose');

const distinctiveSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    images:[{
        type:String,
        required:true
    }]
},{
    timestamps: true
})

module.exports = mongoose.model('Distinctive',distinctiveSchema);