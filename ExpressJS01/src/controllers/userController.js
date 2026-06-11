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
    refreshTokenService,
    REFRESH_COOKIE_NAME,
    getRefreshCookieOptions,
    getClearRefreshCookieOptions,
} = require("../services/userService");

const getCookieValue = (req, name) => {
    const cookieHeader = req.headers.cookie || "";
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim()).filter(Boolean);
    const cookie = cookies.find((item) => item.startsWith(`${name}=`));
    if (!cookie) return "";
    return decodeURIComponent(cookie.slice(name.length + 1));
};

const sendAuthResponse = (res, data, statusCode = 200) => {
    if (data.refresh_token) {
        res.cookie(REFRESH_COOKIE_NAME, data.refresh_token, getRefreshCookieOptions());
    }

    const { refresh_token, ...publicData } = data;
    return res.status(statusCode).json(publicData);
};

const createUser = async (req, res) => {
    const { name, email, password } = req.body;
    const data = await createUserService(name, email, password);
    return res.status(200).json(data);
};

const handleLogin = async (req, res) => {
    const { email, password } = req.body;
    const data = await loginService(email, password);
    return sendAuthResponse(res, data);
};

const refreshToken = async (req, res) => {
    const token = getCookieValue(req, REFRESH_COOKIE_NAME);
    const data = await refreshTokenService(token);
    if (data.EC !== 0) {
        res.clearCookie(REFRESH_COOKIE_NAME, getClearRefreshCookieOptions());
        return res.status(401).json(data);
    }

    return sendAuthResponse(res, data);
};

const logout = async (req, res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, getClearRefreshCookieOptions());
    return res.status(200).json({ EC: 0, EM: "Logged out successfully" });
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
    return sendAuthResponse(res, data, data.EC === 0 ? 200 : 400);
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
    refreshToken,
    logout,
};
