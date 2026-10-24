import {
    createClient
} from "@supabase/supabase-js";

const N = 20; // 동시에 보낼 요청 수
const SESSION_ID = "7e2e5c31-9c77-435b-9f92-1a638b1b3337"; // 테스트 할 회차 id
const API = process.env.API_URL; // 예: http://localhost:3001
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1) 테스트 사용자 만들고 로그인해서 토큰 받기
const tokens = [];
for (let i = 0; i < N; i++) {
    const email = `loadtest${i}@example.com`;
    await admin.auth.admin.createUser({
        email,
        password: "Test1234!",
        email_confirm: true
    });
    const {
        data
    } = await anon().auth.signInWithPassword({
        email,
        password: "Test1234!"
    });
    tokens.push(data.session.access_token);
}

// 2) 한꺼번에 예약 요청
const results = await Promise.all(
    tokens.map((t) =>
        fetch(`${API}/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${t}`
            },
            body: JSON.stringify({
                sessionId: SESSION_ID
            }),
        }).then((r) => r.status),
    ),
);

// 3) 결과 집계
const count = (s) => results.filter((x) => x === s).length;
console.log({
    성공: count(201) + count(200),
    마감409: count(409),
    기타: results.filter((x) => ![200, 201, 409].includes(x)).length
});