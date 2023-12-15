const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function Downloader(readUrl){
    console.log('Đang khởi tạo...');
    const browser = await puppeteer.launch({
		headless: "new",
		defaultViewport: null,
		args: ['--no-sandbox'],
	});
	const page = await browser.newPage();
	await page.setExtraHTTPHeaders({
		"Accept-Language": "en",
        referer: 'https://hentaivn.tv/'
	});
	await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36');
	page.setDefaultNavigationTimeout(0);

    await page.setCookie(
        {
            name: 'view1',
            value: '1',
            domain: 'hentaivn.tv'
        },
        {
            name: 'user_id',
            value: '4',
            domain: 'hentaivn.tv'
        }
    );

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

    let imgsArr = await page.evaluate(async () => {
        let imgsUrl = [];
        let imgElements = document.querySelectorAll('#image img');
        for(let i = 0; i < imgElements.length; i++){
            let src = imgElements[i].getAttribute('src');
            imgsUrl.push(src);
        }
        return imgsUrl;
    });

    console.log(`Tổng cộng: ${imgsArr.length} ảnh.`);
    console.log('Đang tải...');

    for(let i = 0; i < imgsArr.length; i++){
        var viewSource = await page.goto(imgsArr[i]);
        const imgName = path.basename(imgsArr[i]).split('?')[0];
        fs.writeFile(`./${title}/${chap}/${imgName}`, await viewSource.buffer(), function(err) {
            if(err) return console.log(err);
            process.stdout.clearLine(); 
            process.stdout.cursorTo(0); 
            process.stdout.write(`Đã tải ${i+1}/${imgsArr.length}`);
        })
    }
  
    await new Promise(resolve => setTimeout(resolve, 1000));

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
            
            // chỉ nên dùng cái bên dưới khi truyện có ít hơn 3 chương hoặc máy của bạn đủ mạnh
            // const downloadPromises = listChapter.map(chapter => Downloader(chapter));
            // await Promise.all(downloadPromises);
    
            rl.close();
        });
    } catch (error) {
        console.log(error);
    }
    
}

main();