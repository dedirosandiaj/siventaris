import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
          <title>Siventaris</title>
          {assets}
        </head>
        <body class="bg-gray-100 min-h-screen">
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
