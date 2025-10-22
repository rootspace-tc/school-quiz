// Netlify Functions는 Node.js 환경에서 실행됩니다.
// node-fetch v2를 사용하기 위해 require를 사용합니다.
const fetch = require('node-fetch');

// 서버리스 함수 핸들러
exports.handler = async (event, context) => {
    // 1. URL 쿼리에서 'word' 파라미터 가져오기
    const word = event.queryStringParameters.word;
    if (!word) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '단어(word) 파라미터가 필요합니다.' }),
        };
    }

    // 2. 환경 변수(비밀 금고)에서 API 키를 안전하게 가져오기
    const CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '서버 환경 변수(API 키)가 설정되지 않았습니다.' }),
        };
    }

    // 3. 네이버 API 호출
    const encodedWord = encodeURIComponent(word);
    const apiUrl = `https://openapi.naver.com/v1/search/encyc.json?query=${encodedWord}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'X-Naver-Client-Id': CLIENT_ID,
                'X-Naver-Client-Secret': SECRET,
            }
        });

        if (!response.ok) {
             const errorBody = await response.text();
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `외부 API 호출 실패: ${response.status}`, details: errorBody }),
            };
        }

        const data = await response.json();

        // 4. 데이터 가공 및 반환
        let definition = null;
        if (data.items && data.items.length > 0) {
            let rawDefinition = data.items[0].description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
            definition = rawDefinition.split('.')[0] + '.';
        }

        // 5. 성공 응답 (CORS 문제는 Netlify가 자동으로 해결합니다.)
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, definition: definition }),
        };

    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `함수 실행 중 오류 발생: ${error.message}` }),
        };
    }
};
