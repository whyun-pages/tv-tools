# TVBox JSON 加密格式总结

基于 `app/src/main/java/com/github/tvbox/osc/api/ApiConfig.java` 的 `FindResult()` 和 `app/src/main/java/com/github/tvbox/osc/util/AES.java` 整理。

## 1. 总体判定顺序

TVBox 读取远程配置内容时，按下面顺序判断：

1. 如果内容本身就是合法 JSON，直接使用。
2. 如果内容里命中前缀标记 `[A-Za-z0]{8}**`，跳过这 10 个字符后，把剩余内容做 Base64 解码。
3. 如果解码后的内容以 `2423` 开头，按一套内嵌参数的 `AES-CBC` 格式解密。
4. 否则，如果 URL 里通过 `;pk;` 提供了密钥，则按 `AES-ECB` 解密。
5. 都不满足时，直接把内容当明文使用。

## 2. 外层包装格式

某些配置会带一个前缀头，匹配规则是：

```txt
[A-Za-z0]{8}**
```

例如：

```txt
ABCDEFG0**<base64内容>
```

处理规则：

1. 去掉前 10 个字符，也就是 `8` 个字母/数字/字符 `0` 加上 `**`
2. 对剩余内容执行 Base64 解码
3. 再进入后续 JSON / CBC / ECB 判定

## 3. CBC 加密格式

如果 Base64 解码后的字符串以 `2423` 开头，则走 CBC 分支。

### 3.1 原始结构特征

该字符串本质上是一个十六进制字符串，代码里会直接：

1. 用原始十六进制文本提取密文段
2. 再把整段十六进制转成字节，再转 UTF-8 文本并转小写
3. 从转换后的文本里提取 key 和 iv

### 3.2 密文提取规则

密文数据 `data` 的取法：

```txt
data = content.substring(content.indexOf("2324") + 4, content.length() - 26)
```

也就是：

1. 找到分隔标记 `2324`
2. 从它后面开始截取
3. 去掉尾部最后 26 个字符

### 3.3 key 提取规则

先把整段十六进制内容转成文本，再转小写，然后取：

```txt
$#<key>#$
```

中间的内容作为 key，再右侧补 `0` 到 16 位：

```txt
key = rightPadding(extractedKey, "0", 16)
```

超过 16 位会被截断到 16 位。

### 3.4 iv 提取规则

仍然基于“十六进制转文本后的字符串”，取最后 13 个字符作为 iv 来源，再右侧补 `0` 到 16 位：

```txt
iv = rightPadding(decodedContent.substring(decodedContent.length() - 13), "0", 16)
```

### 3.5 解密算法

```txt
AES/CBC/PKCS7Padding
```

实现到 Node.js / TypeScript 时通常可对应：

```txt
aes-128-cbc + PKCS padding
```

前提是 key / iv 最终都是 16 字节。

## 4. ECB 加密格式

如果内容不是 JSON，也不满足上面的 `2423...` CBC 格式，但传入了 `configKey`，则走 ECB 分支。

### 4.1 configKey 来源

配置地址支持这种写法：

```txt
http://example.com/config;pk;your_key
```

TVBox 会按 `;pk;` 分割，把后半段当作 `configKey`。

### 4.2 解密算法

```txt
AES/ECB/PKCS7Padding
```

key 规则：

```txt
key = rightPadding(configKey, "0", 16)
```

密文内容直接被当作十六进制字符串转字节后解密。

## 5. rightPadding 规则

TVBox 的 key / iv 处理都使用同一个补位逻辑：

1. 先 `trim()`
2. 长度大于目标长度时截断
3. 长度不足时在右侧补指定字符

这里目标长度固定是 `16`，补位字符固定是 `"0"`。

## 6. 可归纳出的几种配置形态

### 明文 JSON

```txt
{"sites":[...],"parses":[...]}
```

### 带前缀包装的内容

```txt
ABCDEFG0**<base64字符串>
```

Base64 解开后，内部可能是：

1. 明文 JSON
2. `2423...` 开头的 CBC 十六进制串
3. 其他待进一步处理的文本

### 纯 ECB 十六进制密文

需要配合：

```txt
...;pk;<configKey>
```

一起使用。

## 7. 实现迁移时的注意点

1. Java 代码里写的是 `PKCS7Padding`，但在 Node.js 里通常直接使用默认 PKCS padding 即可。
2. CBC 分支中，`key` 和 `iv` 都不是固定位置明文，而是从十六进制内容转文本后再提取。
3. CBC 分支对“十六进制转文本后的内容”调用了 `toLowerCase()`，因此 `$#...#$`、尾部 iv 字符串的解析都按小写处理更稳妥。
4. `FindResult()` 的第一优先级永远是“是否已经是 JSON”，因此有些地址虽然带 `;pk;`，但如果服务端直接返回 JSON，也不会走解密。
