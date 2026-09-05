const profile = require('../models/selectUserModels');
const register = require('../models/selectRegisterModels');
const update = require('../models/updateModels');
const writeLog = require('../models/writeLog');

const getProfile = async (req, res) => {
    try {
        const user_id = req.params.id;

        const result = await profile(user_id);

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(user);

    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const putProfile = async (req, res) => {
    try {
        const user_id = Number(req.params.id);
        const {
            display_name,
            shop_name,
            city,
            address,
            phone,
            work_days,
            work_time_start,
            work_time_end
        } = req.body;

        if (!display_name) {
            return res.status(400).json({
                error: 'display_name обязателен'
            });
        }

        const userResult = await register.user(user_id);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const company_id = userResult.rows[0].company_id;

        const beforeResult = await register.userPlus(user_id);

        const before = beforeResult.rows[0];

        const result = await update.user({display_name, shop_name, city, address, phone, user_id});

        await update.companiesJSON({work_days, work_time_start, work_time_end, company_id});

        const profile = result.rows[0];

        if (!profile) {
            return res.status(404).json({
                error: 'Профиль не найден'
            });
        }

        await writeLog({
            company_id,
            user_id,
            entity_type: 'profile',
            entity_id: profile.id,
            action: 'update',
            title: 'Изменены настройки компании',
            details: {
                before,
                after: {
                    display_name: profile.display_name,
                    shop_name: profile.shop_name,
                    city: profile.city,
                    address: profile.address,
                    phone: profile.phone
                }
            }
        });

        res.json({
            message: 'Профиль обновлён',
            profile
        });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { getProfile, putProfile };