import express from "express";
import homeController from "../controllers/homeController";
import loginController from "../controllers/loginController";
import { 
    loginLimiter, 
    loginValidator, 
    refreshTokenLimiter,
    authenticateToken, 
    authorizeUser, 
    authorizeAdmin 
} from "../middleware/loginMiddleware";

let router = express.Router();

let initWebRoutes = (app) => {
    // ==========================================
    // TRANG CHỦ & CRUD CƠ BẢN
    // ==========================================
    router.get('/', (req, res) => {
        return res.send('Bùi Thanh Tùng');
    });
    router.get('/home', homeController.getHomePage);
    router.get('/about', homeController.getAboutPage);
    router.get('/crud', homeController.getCRUD);
    router.post('/post-crud', homeController.postCRUD);
    router.get('/get-crud', homeController.getFindAllCrud);
    router.get('/edit-crud', homeController.getEditCRUD);
    router.post('/put-crud', homeController.putCRUD);
    router.get('/delete-crud', homeController.deleteCRUD);

    // ==========================================
    // LOGIN UI (Vũ Minh Khang - 23110238)
    // ==========================================
    router.get('/login-page', (req, res) => {
        return res.render('login.ejs');
    });

    router.get('/user/profile-page', (req, res) => {
        return res.render('userProfile.ejs');
    });

    router.get('/admin/profile-page', (req, res) => {
        return res.render('adminProfile.ejs');
    });

    // ==========================================
    // LOGIN API (Vũ Minh Khang - 23110238)
    // Bảo mật: Rate Limiting + Validation + JWT + Authorization
    // ==========================================
    
    // POST /api/login - Đăng nhập
    // Áp dụng: loginLimiter (chống brute-force) + loginValidator (kiểm tra input)
    router.post('/api/login', loginLimiter, loginValidator, loginController.handleLogin);

    // POST /api/refresh-token - Cấp lại Access Token khi hết hạn
    // Áp dụng: refreshTokenLimiter
    router.post('/api/refresh-token', refreshTokenLimiter, loginController.handleRefreshToken);

    // POST /api/logout - Đăng xuất (xóa refresh token)
    router.post('/api/logout', loginController.handleLogout);

    // ==========================================
    // AUTHORIZATION - Phân quyền theo Role
    // ==========================================
    
    // GET /user/profile - Trang profile cho User (R2) và Admin (R1)
    // Áp dụng: authenticateToken (xác thực JWT) + authorizeUser (kiểm tra quyền)
    router.get('/user/profile', authenticateToken, authorizeUser, loginController.getUserProfile);

    // GET /admin/profile - Trang profile cho Admin (R1)
    // Áp dụng: authenticateToken (xác thực JWT) + authorizeAdmin (chỉ Admin)
    router.get('/admin/profile', authenticateToken, authorizeAdmin, loginController.getAdminProfile);

    return app.use("/", router);
}

export default initWebRoutes;