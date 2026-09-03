const pool = require('../db');

async function orders(data) {
    const { 
        phone, 
        customer, 
        worker, 
        device, 
        model, 
        SN, 
        status, 
        price, 
        pre, 
        acceptDate, 
        deadline, 
        crush, 
        note, 
        id, 
        company_id 
    } = data;
    
    const result = await pool.query(
        `UPDATE orders
         SET phone = $1,
             customer = $2,
             worker = $3,
             device = $4,
             model = $5,
             SN = $6,
             status = $7,
             price = $8,
             pre = $9,
             acceptDate = $10,
             deadline = $11,
             crush = $12,
             note = $13
         WHERE id = $14 AND company_id = $15
         RETURNING
             id,
             phone,
             customer,
             worker,
             device,
             model,
             SN AS "SN",
             status,
             price,
             pre,
             acceptDate AS "acceptDate",
             deadline,
             crush,
             note`,
        [
            phone,
            customer,
            worker,
            device,
            model,
            SN,
            status,
            price,
            pre,
            acceptDate,
            deadline,
            crush,
            note,
            id,
            company_id
        ]
    );

    return result;
}

async function archived(data) {
    const { id, company_id } = data;
    const result = await pool.query(
        `UPDATE orders
         SET is_archived = true,
             archived_at = NOW()
         WHERE id = $1 AND company_id = $2
         RETURNING *`,
        [id, company_id]
    );

    return result;
}

async function companies(data) {
    const { user, company } = data;
    const result = await pool.query( 
        `UPDATE companies
         SET owner_user_id = $1
         WHERE id = $2
         RETURNING *`, 
        [user, company]
    );
    return result;
}

async function companiesJSON(data) {
    const { start, end, company } = data;
    return await pool.query(
        `UPDATE companies
        SET work_days = $1::jsonb,
            work_time_start = $2,
            work_time_end = $3
        WHERE id = $4`,
        [
            JSON.stringify(Array.isArray(work_days) ? work_days : []),
            start || null,
            end || null,
            company
        ]);
}

async function user(data) {
    const { display, shop, city, address, phone, user } = data;
    return await pool.query(
        `UPDATE user_profiles
            SET display_name = $1,
                shop_name = $2,
                city = $3,
                address = $4,
                phone = $5
            WHERE user_id = $6
            RETURNING id, user_id, company_id, display_name, shop_name, city, address, phone, avatar_url, created_at`,
            [
                display,
                shop || null,
                city || null,
                address || null,
                phone || null,
                user
            ]
    );
};

async function worker(data) {
    const { name, role, phone, email, is_active, id, company } = data;
    return await pool.query(
        `UPDATE workers
             SET name = $1,
                 role = $2,
                 phone = $3,
                 email = $4,
                 is_active = $5,
                 updated_at = NOW()
             WHERE id = $6 AND company_id = $7
             RETURNING
                id,
                user_id,
                company_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at`,
            [
                name.trim(),
                role || 'Сотрудник',
                phone || null,
                email || null,
                Boolean(is_active),
                id,
                company
            ]
    )
}

module.exports = { orders, archived, companies, companiesJSON, user, worker };