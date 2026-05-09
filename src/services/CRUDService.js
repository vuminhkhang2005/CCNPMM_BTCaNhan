import bcrypt from 'bcryptjs';
import User from '../models/user';

const salt = bcrypt.genSaltSync(10);

let createNewUser = async (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let hashPasswordFromBcrypt = await hashUserPassword(data.password);
            let newUser = new User({
                email: data.email,
                password: hashPasswordFromBcrypt,
                firstName: data.firstName,
                lastName: data.lastName,
                address: data.address,
                phoneNumber: data.phoneNumber,
                gender: data.gender === '1' ? true : false,
                roleId: data.roleId
            });

            await newUser.save();
            resolve('OK! Bùi Thanh Tùng đã tạo user mới vào MongoDB thành công');
        } catch (e) {
            reject(e);
        }
    });
}

let hashUserPassword = (password) => {
    return new Promise(async (resolve, reject) => {
        try {
            let hashPassword = await bcrypt.hashSync(password, salt);
            resolve(hashPassword);
        } catch (e) {
            reject(e);
        }
    });
}

let getAllUser = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let users = await User.find().lean();
            resolve(users);
        } catch (e) {
            reject(e);
        }
    });
}

let getUserInfoById = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let user = await User.findById(userId).lean();
            if (user) {
                resolve(user);
            } else {
                resolve([]);
            }
        } catch (e) {
            reject(e);
        }
    });
}

let updateUser = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            await User.findByIdAndUpdate(data.id, {
                firstName: data.firstName,
                lastName: data.lastName,
                address: data.address
            });
            let allUsers = await User.find().lean();
            resolve(allUsers);
        } catch (e) {
            reject(e);
        }
    });
}

let deleteUserById = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            await User.findByIdAndDelete(userId);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    createNewUser,
    getAllUser,
    getUserInfoById,
    updateUser,
    deleteUserById
};