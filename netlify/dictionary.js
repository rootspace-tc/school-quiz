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

    // 3. 네이버 API 호출 (백과사전 API 사용)
    const encodedWord = encodeURIComponent(word);
    const apiUrl = `https://openapi.naver.com/v1/search/encyc.json?query=${encodedWord}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'X-Naver-Client-Id': CLIENT_ID,
                'X-Naver-Client-Secret': CLIENT_SECRET,
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
        
        // 4. ★★★ [수정됨] 데이터 가공 및 반환 (정확도 향상) ★★★
        let definition = null;
        if (data.items && data.items.length > 0) {
            
            // 검색된 항목들(data.items) 중에서
            // 제목(title)이 검색어(word)와 정확히 일치하는 항목을 찾습니다.
            const foundItem = data.items.find(item => {
                // API가 반환하는 제목(예: <b>사과</b>)에서 HTML 태그를 제거합니다.
                const cleanTitle = item.title.replace(/<[^>]*>?/gm, '').trim();
                
                // "사과 (과일)" 처럼 괄호가 있는 경우, 괄호 앞부분만 비교합니다.
                const titleMain = cleanTitle.split('(')[0].trim();
                
                // 제목과 검색어가 정확히 같은지 확인합니다.
                return titleMain === word;
            });

            // 정확히 일치하는 항목(foundItem)을 찾은 경우에만,
            if (foundItem) {
                // 해당 항목의 설명을 가져옵니다.
                let rawDefinition = foundItem.description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
                // 첫 번째 문장만 사용합니다.
                definition = rawDefinition.split('.')[0] + '.';
            }
            // (일치하는 항목이 없으면 definition은 null로 유지됩니다)
        }

        // 5. 성공 응답 (일치하는 단어가 없으면 definition: null이 반환됨)
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
