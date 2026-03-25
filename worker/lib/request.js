export const getRequestBody = req => new Promise((resolve, reject) => {
  let body = []
  req.on('data', chunk => {
    body.push(chunk)
  })
  req.on('end', () => {
    resolve(Buffer.concat(body))
  })
  req.on('error', reject)
})
