const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

async function Downloader(readUrl){
    console.log('Đang khởi tạo...');
    const browser = await puppeteer.launch({
		headless: "new",
		defaultViewport: null,
		args: ['--no-sandbox']
	});
	const page = await browser.newPage();
	await page.setExtraHTTPHeaders({
		"Accept-Language": "en"
	});
	await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36');
	page.setDefaultNavigationTimeout(0);
    await page.goto(readUrl, { waitUntil: "networkidle0" });
    
    let title = await page.$eval('#unzoom > li:nth-child(3) > a > span', el => el.innerText);
    let chap = await page.$eval('#unzoom > li:nth-child(4) > a > span', el => el.innerText);

    console.log(`Info: ${title} - ${chap}`);

    const invalidChars = /[\/:*?"<>|]/g;
    title = title.replace(invalidChars, '');
    chap = chap.replace(invalidChars, '');

    createFolder(title, `./${title}`);
    createFolder(chap, `./${title}/${chap}`);

    console.log('Đang load ảnh truyện...');

    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            let distance = 100;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });

        let iframe = document.children[0].lastElementChild;
        iframe.remove();

        const backToTop = document.getElementsByClassName('cd-top cd-is-visible');
        backToTop[0].click();
        backToTop[0].remove();
    });

    const imgElements = await page.$$('#image img');

    console.log(`Tổng cộng: ${imgElements.length} ảnh.`);
    console.log('Đang tải...');

    for(let i = 0; i < imgElements.length; i++){
        await imgElements[i].screenshot({
            path: `./${title}/${chap}/p${i+1}.jpg`,
            omitBackground: true,
            type: 'jpeg',
            quality: 100,
            // captureBeyondViewport: true
        });
        process.stdout.clearLine(); 
        process.stdout.cursorTo(0); 
        process.stdout.write(`Đã tải ${i+1}/${imgElements.length}`);  
    }
    console.log(`\nĐã tải xong ${title} - ${chap}.`);

    browser.close();
}

function createFolder(name, path){
    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
        console.log(`Đã tạo thư mục "${name}"`);
    } else {
        console.log(`Thư mục "${name}" đã tồn tại.`);
    }
}

async function getListChapter(id){
    console.log('Đang tìm kiếm...');
    const url = `https://hentaivn.tv/list-showchapter.php?idchapshow=${id}`;
    const browser = await puppeteer.launch({
		headless: "new",
		defaultViewport: null,
		args: ['--no-sandbox']
	});
	const page = await browser.newPage();
	await page.setExtraHTTPHeaders({
		"Accept-Language": "en"
	});
	await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36');
	page.setDefaultNavigationTimeout(0);
    await page.goto(url, { waitUntil: "networkidle0" });

    const isEmty = await page.$eval('.listing', el => el.innerText);
    if(isEmty === 'Chủ thớt đang upload ảnh cho chương truyện, các bạn chờ tí nhé!'){
        //console.log('Truyện không tồn tại.');
        return null;
    }  

    const hrefs = await page.$$eval('a', links => links.map(a => a.href));
    hrefs.reverse();
    browser.close();

    return hrefs;

}

async function main(){
    try {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    
        rl.question('Nhập ID truyện: ', async (answer) => {
            const id = answer.trim();
            const listChapter = await getListChapter(id);
            if(!listChapter){
                console.log('Truyện không tồn tại.');
                return;
            }
            console.log(`Tìm thấy ${listChapter.length} chương.`);
            console.log('Bắt đầu tải...');
    
            for(let i = 0; i < listChapter.length; i++){
                await Downloader(listChapter[i]);
            }
    
            rl.close();
        });
    } catch (error) {
        console.log(error);
    }
    
}

main();