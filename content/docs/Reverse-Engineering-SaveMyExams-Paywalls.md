---
date: '2026-03-29T19:00:00Z'
draft: false
title: 'Reverse Engineering SaveMyExam’s Paywall'
---
SaveMyExams is a very well-known site out there, but they keep a lot of their content behind paywalls. After digging a bit, I worked out all the content is stored in your browsers memory, but hidden behind obfuscated js, making it very hard to reverse engineer. After understanding the data strcutures and styling used to protect their content, I developed a script to bypass it. To try it out, follow the below steps:

- Install [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) (A userscript extension)
- Enable [User Scripts](https://www.tampermonkey.net/faq.php?locale=en#Q209)
- Dowload the script [here](https://github.com/vmd1/user-scripts/raw/refs/heads/main/sme-bypass.user.js)

And now, you have unrestricted access to SaveMyExams revision notes and exam questions.