// webpack.config.js
import path from 'path';
import { fileURLToPath } from 'url';
import Dotenv from 'dotenv-webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: path.resolve(__dirname, 'src/main.js'),
  output: {
    path: path.resolve(__dirname, 'public/dist'),
    filename: 'bundle.js',
    publicPath: '/dist/',
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 8080,
    allowedHosts: 'all',  // Adicione esta linha para permitir todos os hosts
    host: '0.0.0.0', // Permite acesso externo
    hot: true,
    historyApiFallback: true,
    // Use watchFiles para especificar quais arquivos devem ser assistidos
    watchFiles: {
      paths: ['src/**/*', '!public/data/**/*', '!public/dist/**/*'],
    },
    // Se necessário, desabilitar o liveReload
    liveReload: false,
  },
  plugins: [
    new Dotenv({
      systemvars: true
    })
  ],
  resolve: {
    extensions: ['.js']
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|gif|jpg|jpeg|svg|xml|json)$/,
        use: ['url-loader']
      }
    ]
  },
  mode: 'development'
};
