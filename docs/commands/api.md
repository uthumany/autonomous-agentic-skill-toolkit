# API Testing

## `aast test:api <url>`

Performs API tests against a specified URL. Supports various HTTP methods and can send JSON data.

### Arguments

*   `<url>` (required): The endpoint URL for the API test.

### Options

*   `-m, --method <type>`: The HTTP method to use (GET, POST, PUT, DELETE). Defaults to `GET`.
*   `-d, --data <json>`: JSON data to send with `POST` or `PUT` requests. Must be a valid JSON string.

### Examples

```bash
aast test:api https://jsonplaceholder.typicode.com/todos/1
aast test:api https://jsonplaceholder.typicode.com/posts -m POST -d '{"title": "foo", "body": "bar", "userId": 1}'
```
