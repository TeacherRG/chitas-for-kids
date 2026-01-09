// Simple test to check if data loading logic works correctly
const http = require('http');

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function testDataLoad() {
    try {
        console.log('📥 Loading index.json...');
        const index = await fetchJSON('http://localhost:8080/data/index.json');
        console.log(`✅ Index loaded: ${index.dates.length} dates available`);

        const currentDate = '2026-01-09';
        const dateEntry = index.dates.find(d => d.date === currentDate);

        if (!dateEntry) {
            console.error('❌ Date entry not found for:', currentDate);
            return;
        }

        console.log('📌 Date entry:', dateEntry);
        console.log(`📥 Loading content from: data/${dateEntry.content}...`);

        const content = await fetchJSON(`http://localhost:8080/data/${dateEntry.content}`);
        console.log('✅ Content loaded successfully!');
        console.log(`📅 hebrewDate: "${content.hebrewDate}"`);
        console.log(`📝 dedication: "${content.dedication}"`);
        console.log(`📚 sections count: ${content.sections?.length || 0}`);

        if (!content.hebrewDate) {
            console.error('❌ ERROR: hebrewDate is missing or empty!');
        } else {
            console.log('✅ hebrewDate is present and not empty');
        }

        if (!content.dedication) {
            console.warn('⚠️  WARNING: dedication is missing or empty');
        }

        console.log('\n🎉 Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDataLoad();
