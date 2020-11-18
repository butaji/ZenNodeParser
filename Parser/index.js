let xpath = require('xpath')
let dom = require('xmldom').DOMParser
let rss = require('feed').Feed
let datejs = require('date.js')
let fetch = require('node-fetch');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const zen_url = req.query.zen_url;

    console.log(`Processing ${zen_url}`);

    if (!zen_url) {
        context.res = {
            status: 404,
            body: "zen_url not found in the query string"
        };

        return
    }


    let content = await load_url(zen_url)
    let xml = process_content(zen_url, content)

    context.res = {
        body: xml,
        headers: {
            'Content-Type': 'application/rss+xml'
        }
    };
}

async function load_url(url) {
    let result = await fetch(url)

    return result.text()
}

function process_content(zen_url, content) {

    let doc = new dom().parseFromString(content)
    let nodes = xpath.select('.//script[contains(text(), "__serverState__")]', doc)[0]
    
    let regex = /{.+}/g
    let data = regex.exec(nodes)[0]
    let obj = JSON.parse(data)
    
    var server_state = ''
    
    for (const key in obj) {
        if (key.includes('__serverState__')) {
    
            server_state = obj[key]
        }
    }
    
    let items = server_state.feed.items
    let items_order = server_state.feed.itemsOrder
    let publisher = server_state.channel.source
    
    var feed = new rss({
        title: publisher.title,
        description: publisher.description ? publisher.description : 'News',
        language: 'ru',
        id: 'http://zen.yandex.ru/',
        link: zen_url,
        image: publisher.logo,
        generator: "awesome", // optional, default = 'Feed for Node.js'
        author: {
            name: "-",
            email: "-"
        }
    });
    
    for (const i in items_order) {
    
        let post = items[items_order[i]]
    
        if (post.type != 'image_card') {
            continue
        }
    
        feed.addItem({
            guid: post.link.split('?')[0],
            title: post.title,
            description: post.text,
            enclosure: {
                url: post.image,
                type: 'image/webp',
                length: 2048
            },
            link: post.link.split('?')[0],
            date: datejs(post.creationTime)
        });
    }
    
    
    // cache the xml to send to clients
    var xml_output = feed.rss2();

    return xml_output
}