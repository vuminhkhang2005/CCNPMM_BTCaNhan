import express from "express"; //gọi Express
import homeController from "../controller/homeController"; //gọi controller

let router = express.Router(); //khởi tạo Route

let initWebRoutes = (app) => {
    //cách 1:
    router.get('/', (req, res) => {
        return res.send(`
            <div style="text-align:center; margin-top:80px; font-family:Arial,sans-serif;">
                <h1>Vũ Minh Khang - MSSV: 23110238</h1>
                <p>CRUD Express.js – Sequelize – MySQL</p>
                <a href="/crud" style="display:inline-block; margin:10px; padding:12px 30px; background:#007bff; color:#fff; text-decoration:none; border-radius:5px; font-size:16px;">Tạo User Mới</a>
                <a href="/get-crud" style="display:inline-block; margin:10px; padding:12px 30px; background:#28a745; color:#fff; text-decoration:none; border-radius:5px; font-size:16px;">Danh Sách Users</a>
            </div>
        `);
    });
    //cách 2: gọi hàm trong controller
    router.get('/home', homeController.getHomePage); //url cho trang chủ
    router.get('/about', homeController.getAboutPage); //url cho trang about
    router.get('/crud', homeController.getCRUD); //url get crud
    router.post('/post-crud', homeController.postCRUD); //url post crud
    router.get('/get-crud', homeController.getFindAllCrud) //url lấy findAll
    router.get('/edit-crud', homeController.getEditCRUD); //url get editcrud
    router.post('/put-crud', homeController.putCRUD); //url put crud
    router.get('/delete-crud', homeController.deleteCRUD); //url get delete crud

    return app.use("/", router); //url mặc định
}

module.exports = initWebRoutes;
