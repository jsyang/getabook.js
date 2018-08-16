# getabook.js

Inspired by code from https://njw.name/getxbook/, this Node script scrapes all the Look Inside images from an Amazon product page. Like `getabook` this file has no dependencies other than Node.

### Usage

`node getabook.js [ASIN]` 

ASIN is the [Amazon Standard Identification Number](https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=898182), you can find it in the URL of a book page:

```
ex:

      https://www.amazon.co.uk/Learning-Node-Server-Side-Shelley-Powers/dp/1491943122
                                                                              ^^^^
                                                                              ASIN

```

#### GPL License
Applies here.
