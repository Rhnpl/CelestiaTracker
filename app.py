import os
from flask import Flask, render_template
from config import db

app = Flask(__name__, template_folder='app/templates', static_folder='app/static')

basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'app', 'dados.db')

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLACLHEMY_TRACK_MODIFICANTIONS'] = False

db.init_app(app)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__ ':
    app.run(debug=True)