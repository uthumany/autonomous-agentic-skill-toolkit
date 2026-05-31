# Record Video

## `aast record:video <url>`

Records a video of user interactions or page loading on a given URL. This is useful for capturing dynamic behavior and reproducing bugs.

### Arguments

*   `<url>` (required): The URL of the page to record.

### Options

*   `-o, --output <path>`: The output path for the video file. Defaults to `video.webm`.
*   `-d, --duration <seconds>`: The duration of the video recording in seconds. Defaults to `5` seconds.

### Examples

```bash
aast record:video https://example.com -o my_app_flow.webm -d 10
```
