const OwnerSchema = require('../models/owner.model');
const bcrypt = require('bcrypt');
const {
    generateAccessToken,
    generateRefreshToken,
    addOwnerRefreshToken,
    deleteOwnerRefreshToken
} = require('../util/refreshToken');

// 🧩 Hàm helper để chỉ trả về dữ liệu an toàn
function sanitizeOwner(owner) {
    if (!owner) return null;
    const { _id, profile, apps, role } = owner;
    console.log( "Đăng nhập user", _id, profile, apps, role )
    return { _id, profile, apps, role };
}

// 🧠 Lấy tất cả owner (chỉ admin)
exports.getAllOwners = async (req, res) => {
    try {
        const owners = await OwnerSchema.find().select('_id profile apps role');
        res.status(200).json(owners);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving owners', error: err });
    }
};

// 🔍 Lấy owner theo ID (admin hoặc chính owner - quyền đã check bằng middleware)
exports.getOwnerById = async (req, res) => {
    const ownerId = req.params.id;
    try {
        const owner = await OwnerSchema.findById(ownerId).select('_id profile apps role');
        if (!owner) return res.status(404).json({ message: 'Owner not found' });
        res.status(200).json(sanitizeOwner(owner));
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving owner', error: err });
    }
};

// 🧱 Tạo owner mới
exports.createOwner = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existing = await OwnerSchema.findOne({ "profile.email": email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const owner = new OwnerSchema({
            profile: { name, email },
            password: hashedPassword,
            role: 'owner'
        });

        await owner.save();
        res.status(201).json(sanitizeOwner(owner));
    } catch (err) {
        res.status(500).json({ message: 'Error creating owner', error: err });
    }
};

// 🔐 Tạo admin (dành cho ADMIN_SECRET)
exports.createWaterbaseAdmin = async (req, res) => {
    const { name, email, password, adminSecret } = req.body;
    console.log("crate new admin: ", name, email, password, adminSecret)
    if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: 'Invalid admin secret key' });
    }

    try {
        const existing = await OwnerSchema.findOne({ 'profile.email': email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new OwnerSchema({
            profile: { name, email },
            password: hashedPassword,
            role: 'admin'
        });

        await admin.save();
        res.status(201).json(sanitizeOwner(admin));
    } catch (err) {
        res.status(500).json({ message: 'Error creating admin', error: err });
    }
};

// 🧾 Cập nhật owner
exports.updateOwner = async (req, res) => {
    const ownerId = req.params.id;
    const { name, email, password } = req.body;

    if (req.user.role !== 'admin' && req.user._id.toString() !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        const updateData = { "profile.name": name, "profile.email": email };
        if (password) updateData.password = await bcrypt.hash(password, 10);

        const updatedOwner = await OwnerSchema.findByIdAndUpdate(ownerId, updateData, { new: true })
            .select('_id profile apps role');
        if (!updatedOwner) return res.status(404).json({ message: 'Owner not found' });

        res.status(200).json(sanitizeOwner(updatedOwner));
    } catch (err) {
        res.status(500).json({ message: 'Error updating owner', error: err });
    }
};

// 🗑️ Xóa owner
exports.deleteOwner = async (req, res) => {
    const ownerId = req.params.id;
    try {
        // Sửa: Dùng findByIdAndDelete
        const deleted = await OwnerSchema.findByIdAndDelete(ownerId);
        if (!deleted) return res.status(404).json({ message: 'Owner not found' });
        res.status(200).json({ message: 'Owner deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting owner', error: err });
    }
};

// ⚙️ Thêm/xóa apps của owner
exports.updateOwnerApps = async (req, res) => {
    const ownerId = req.params.id;
    const { action, app } = req.body;

    if (req.user.role !== 'admin' && req.user._id.toString() !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        let updatedOwner;

        if (action === 'add') {
            updatedOwner = await OwnerSchema.findByIdAndUpdate(
                ownerId,
                { $push: { apps: { ...app, createdAt: new Date() } } },
                { new: true }
            ).select('_id profile apps role');
        } else if (action === 'remove') {
            updatedOwner = await OwnerSchema.findByIdAndUpdate(
                ownerId,
                { $pull: { apps: { appId: app.appId } } },
                { new: true }
            ).select('_id profile apps role');
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        if (!updatedOwner) return res.status(404).json({ message: 'Owner not found' });
        res.status(200).json(sanitizeOwner(updatedOwner));
    } catch (err) {
        res.status(500).json({ message: 'Error updating apps', error: err });
    }
};

// 🔑 Login
exports.loginOwner = async (req, res) => {
    const { email, password } = req.body;

    try {
        const owner = await OwnerSchema.findOne({ "profile.email": email });
        if (!owner) return res.status(404).json({ message: 'Owner not found' });

        const isMatch = await bcrypt.compare(password, owner.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

        // Sửa: Tạo Access Token với payload chi tiết
        const accessTokenPayload = {
            id: owner._id,
            role: owner.role,
            apps: owner.apps // Thêm apps để giảm DB lookup trong checkAppAccess
        };
        const accessToken = generateAccessToken(accessTokenPayload);

        const refreshToken = generateRefreshToken(owner._id);
        await addOwnerRefreshToken(owner._id, refreshToken, accessToken);

        res.status(200).json({
            owner: sanitizeOwner(owner),
            accessToken,
            refreshToken // Nên trả về Refresh Token để client lưu trữ (tốt nhất là HTTP-only Cookie)
        });
    } catch (err) {
        res.status(500).json({ message: 'Error during login', error: err });
    }
};

// 🚪 Logout
exports.logoutOwner = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(400).json({ message: 'Missing Authorization header' });
    }
    const accessToken = authHeader.split(' ')[1]; 

    try {
        // req.user._id đã có nhờ ownermiddleware
        await deleteOwnerRefreshToken(req.user.id, accessToken); // Dùng req.user.id (từ decoded token)
        res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        res.status(500).json({ message: 'Error during logout', error: err });
    }
};
