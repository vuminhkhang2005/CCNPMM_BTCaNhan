const {
    createUserService,
    loginService,
    getUserService,
    getAccountService,
    createManagedUserService,
    updateUserService,
    setUserActiveService,
    updateProfileService,
    forgotPasswordService,
    resetPasswordService,
} = require("../services/userService");

const createUser = async (req, res) => {
    const { name, email, password } = req.body;
    const data = await createUserService(name, email, password);
    return res.status(200).json(data);
};

const handleLogin = async (req, res) => {
    const { email, password } = req.body;
    const data = await loginService(email, password);
    return res.status(200).json(data);
};

const getUser = async (req, res) => {
    const data = await getUserService();
    return res.status(200).json(data);
};

const getAccount = async (req, res) => {
    const data = await getAccountService(req.user.email);
    if (data.EC !== 0) {
        return res.status(data.EC === 2 ? 403 : 404).json(data);
    }
    return res.status(200).json({ EC: 0, ...data.user });
};

const createManagedUser = async (req, res) => {
    const data = await createManagedUserService(req.body);
    return res.status(data.EC === 0 ? 201 : 400).json(data);
};

const updateUser = async (req, res) => {
    const data = await updateUserService(req.params.id, req.body, req.user.email);
    return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const deactivateUser = async (req, res) => {
    const data = await setUserActiveService(req.params.id, false, req.user.email);
    return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const activateUser = async (req, res) => {
    const data = await setUserActiveService(req.params.id, true, req.user.email);
    return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const updateProfile = async (req, res) => {
    const data = await updateProfileService(req.user.email, req.body);
    return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const data = await forgotPasswordService(email);
    return res.status(200).json(data);
};

const resetPassword = async (req, res) => {
    const { email, resetToken, newPassword } = req.body;
    const data = await resetPasswordService(email, resetToken, newPassword);
    return res.status(200).json(data);
};

module.exports = {
    createUser,
    handleLogin,
    getUser,
    getAccount,
    createManagedUser,
    updateUser,
    deactivateUser,
    activateUser,
    updateProfile,
    forgotPassword,
    resetPassword,
};
