import User from '../models/User.js'
import generateID from '../helpers/generateID.js'
import generateJWT from '../helpers/generateJWT.js'
import { emailRegister, emailNewPassword } from '../helpers/email.js'
import { fileURLToPath } from "url";
import path from "path"
import fs from "fs"
import Categories from '../models/Categories.js';


//registra un user
const registerUser = async (req, res) => {

    //evitar email o usuarios duplicados
    const {email} = req.body;
    const existUser = await User.findOne({email: email});
    
    if(existUser){
        const error = new Error('Este Email ya esta registrado');
        return res.status(400).json({msg: error.message});
    }
    try {
        const user = new User(req.body);
        user.token = generateID();
        await user.save();

        emailRegister({
            email: user.email,
            name: user.name,
            token: user.token
        })

        res.json({ msg: "Usuario creado correctamente, revisa tu email para confrimarlo."})
    } catch (error) {
        console.log(error);
    }
}

const authUser = async (req, res) => {

    const {email, password} = req.body;
    //comprobar si el user existe
    const user = await User.findOne({email : email});
    if(!user){
        const error = new Error("Este user no exite");
        return res.status(404).json({msg: error.message});
    }

    //comprobar si el user esta confirmado
    if(!user.confirm){
        const error = new Error("Esta cuanta no ha sido confirmada");
        return res.status(403).json({msg: error.message});
    }

    //comporbar su password
    if(await user.checkPassword(password)){
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: generateJWT(user._id) //<-- genera un JWT
        })
    }else{
        const error = new Error("La contraseña es incorrecta");
        return res.status(404).json({msg: error.message});
    }
}

const confirm = async (req, res) => {
    const {token} = req.params;
    //buscar user
    const userConfirm = await User.findOne({token: token});

    if(!userConfirm){
        const error = new Error("Token no valido");
        return res.status(403).json({msg: error.message});
    }
    try {
        userConfirm.confirm = true;
        userConfirm.token = '';
        await userConfirm.save();
        res.json({msg: "Usuario confirmado correctamente"});
    } catch (error) {
        console.log(error);
    }
}

const forgetPassword = async(req, res) => {
    const {email} = req.body;
    const user = await User.findOne({email: email});
    
    if(!user){
        const error = new Error('Este user no existe');
        return res.status(400).json({msg: error.message});
    }

    try {
        user.token = generateID();
        await user.save();
        emailNewPassword({
            email: user.email,
            name: user.name,
            token: user.token
        })
        res.json({msg: "Hemos enviado un email con las instruccioes"});
    } catch (error) {
        console.log(error);
    }
}

const checkToken = async (req, res) => {
    const {token} = req.params;

    const tokenValid = await User.findOne({token});

    if(tokenValid){
        res.json({msg: "Token valido y el usuario existe"})
    }else{
        const error = new Error('Token no valido');
        return res.status(400).json({msg: error.message});
    }
}

const newPassword = async (req, res) => {
    const {token} = req.params;
    const {password} = req.body;

    const user = await User.findOne({token});

    if(user){
        user.password = password //se asigna el nuevo password
        user.token = '' //se reinicia el token
        try {
            await user.save();
            res.json({msg: "Password Modificado Correctamente"}) 
        } catch (error) {
            console.log(error);
        }
    }else{
        const error = new Error('Token no valido');
        return res.status(400).json({msg: error.message});
    }
}

const newInfoUser = async (req, res) => {
    const{profilePicture, info} = req.body
    console.log(req.body);
    const{id} = req.params;
    const user = await User.findById(id);
    console.log(id);
    if(user){
        console.log('encontrado');
    }
    console.log(user);
    if(user){

        try {
            if(req.body.previousName){
                if((req.body.previousName !== "")){
                    const __filename = fileURLToPath(import.meta.url);
                    const __dirname = path.dirname(__filename);
                    console.log(__dirname);
                    fs.unlinkSync(__dirname+`/../uploads-profile/${req.body.previousName}`);
                    console.log('archivo eliminado');
                }
            }

            user.info = req.body.info //se asigna el nuevo password
            user.profilePicture = req.body.profilePicture //se reinicia el token
            await user.save();
            res.json({msg: "User modified"}) 
        } catch (error) {
            console.log(error);
        }
    }else{
        const error = new Error('Token no valido');
        return res.status(400).json({msg: error.message});
    }
    
}

const getOneUser = async (req, res, next) =>{
    try {
        const user = await User.findById(req.params.id).populate({
            path: "postsSaved",
            populate: {
                path: "posts",
                populate:{
                    path: "user"
                }
            }
        })
        // .populate({
        //     path: "postsSaved",
        //     populate: {
        //         path: "posts",
        //         populate:{
        //             path: "usersSavedPost",
        //             populate:{
        //                 path: "users"
        //             }
        //         }
        //     } 
        // })
        res.json(user);            
    } catch (error) {
        console.log(error);
        res.json({msg: 'This post does not exist'});
        next();
    }    
}

// const getOneUserWPS = async () => {
//     try {
//         const user = await User.findById(req.params.id).populate('postsSaved.posts').populate({
//             path: "postsSaved",
//             populate: {
//                 path: "posts",
//                 populate:{
//                     path: "user"
//                 }
//             }
//         }).populate({
//             path: "postsSaved",
//             populate: {
//                 path: "posts",
//                 populate:{
//                     path: "user"
//                 }
//             } 
//         })
//         res.json(user);            
//     } catch (error) {
//         console.log(error);
//         res.json({msg: 'This post does not exist'});
//         next();
//     }  
// }

const saveFollowTag = async  (req, res) => {
    // console.log(req.body);
    // console.log(req.params);
    const category = await Categories.findById(req.body._id)
    const user = await User.findById(req.params.id)
    // console.log(category);
    // console.log(user);

    const userFound = category.follows.users.includes(user._id);
    const categoryFound = user.followsTags.tags.includes(category._id);
    if(userFound && categoryFound){
        console.log('encrontado');

        const arrayC = category.follows.users;
        const indexCat = arrayC.indexOf(user._id);
        arrayC.splice(indexCat, 1);
        category.follows.users = arrayC;
        category.follows.countFollows = category.follows.countFollows -1
        
        const arrayU = user.followsTags.tags;
        const indexU = arrayU.indexOf(category._id);
        arrayU.splice(indexU, 1);
        user.followsTags.tags = arrayU;
        user.followsTags.countTags = user.followsTags.countTags -1

        await user.save();
        await category.save();


    }else{
        const newUserOnCategory = [...category.follows.users, user._id]
        console.log(newUserOnCategory);
        category.follows.users = newUserOnCategory;
        category.follows.countFollows = category.follows.countFollows + 1;

        const newCategoryOnUser = [...user.followsTags.tags, category._id];
        console.log(newCategoryOnUser);
        user.followsTags.tags = newCategoryOnUser;
        user.followsTags.countTags = user.followsTags.countTags +1

        await user.save();
        await category.save();
        console.log('no encontrado');
    }
}

const profile = async (req, res) => {
    const {user} = req;
    res.json(user);
}


export {
    registerUser,
    authUser,
    confirm,        
    forgetPassword,
    checkToken,
    newPassword,
    newInfoUser,
    getOneUser,
    saveFollowTag,
    // getOneUserWPS,
    profile
}