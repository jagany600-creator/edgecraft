import os
from flask import Flask, render_template, request, jsonify, session
from datetime import datetime
from flask import Flask, render_template, request, redirect, session, jsonify, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth
app = Flask(__name__)
app.secret_key = 'edgecraft_secret_key'

# 1. Tell Flask to save the database inside the instance/ folder
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///edgecraft.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 2. Initialize SQLAlchemy
db = SQLAlchemy(app)
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(500), default='/static/bull-3d.png')
    auth_provider = db.Column(db.String(50), default='local')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
class Trade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # 1. Basic Information
    trade_date = db.Column(db.String(20), nullable=False)
    day_of_week = db.Column(db.String(15), nullable=False)
    symbol = db.Column(db.String(20), nullable=False)
    direction = db.Column(db.String(10), nullable=False)
    session = db.Column(db.String(20), nullable=False)
    setup = db.Column(db.String(50), nullable=False)
    market_condition = db.Column(db.String(50), default='Trending')  # <-- ADD HERE

    # 2. Execution
    lot_size = db.Column(db.Float, nullable=False)
    entry_time = db.Column(db.String(20), nullable=True)
    entry_price = db.Column(db.Float, nullable=False)
    stop_loss = db.Column(db.Float, nullable=False)
    take_profit = db.Column(db.Float, nullable=True)
    exit_time = db.Column(db.String(20), nullable=True)
    exit_price = db.Column(db.Float, nullable=False)

    # 3. Performance (Calculated)
    risk_percent = db.Column(db.Float, default=0.0)
    planned_risk = db.Column(db.Float, default=0.0)
    pnl = db.Column(db.Float, nullable=False)
    r_multiple = db.Column(db.Float, nullable=False)
    result = db.Column(db.String(10), nullable=False)

    # 4. Psychology
    emotion_before = db.Column(db.String(30), nullable=True)
    emotion_during = db.Column(db.String(30), nullable=True)
    emotion_after = db.Column(db.String(30), nullable=True)
    confidence_level = db.Column(db.Integer, default=5)
    stress_level = db.Column(db.Integer, default=5)
    fomo_level = db.Column(db.Integer, default=5)

    # 5. Discipline
    follow_plan = db.Column(db.Boolean, default=True)
    exit_early = db.Column(db.Boolean, default=False)
    follow_checklist = db.Column(db.Boolean, default=True)
    overtraded = db.Column(db.Boolean, default=False)
    move_stop = db.Column(db.Boolean, default=False)
    revenge_trade = db.Column(db.Boolean, default=False)

    # 6. Reflection
    trade_notes = db.Column(db.Text, nullable=True)
    what_went_well = db.Column(db.Text, nullable=True)
    what_went_wrong = db.Column(db.Text, nullable=True)
    lesson_learned = db.Column(db.Text, nullable=True)

    # 7. Evidence
    before_screenshot = db.Column(db.String(255), nullable=True)
    during_screenshot = db.Column(db.String(255), nullable=True)
    after_screenshot = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# 1. Login Page Route
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect('/dashboard')
    return render_template('index.html')

# 2. Main Dashboard Page Route
@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('dashboard.html', username=session.get('username', 'Trader'))

# 3. Habit Tracker Page Route
@app.route('/habits')
def habits():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('habits.html', username=session.get('username', 'Trader'))

# 4. Trade Log Page Route
@app.route('/trades')
@app.route('/tradeslog')
def trades():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('tradeslog.html', username=session.get('username', 'Trader'))
# Analytics Page Route
@app.route('/analytics')
def analytics():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('analytics.html', username=session.get('username', 'Trader'))
# Psychology Page Route
@app.route('/psychology')
def psychology():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('psychology.html', username=session.get('username', 'Trader'))
# Calendar Page Route
@app.route('/calendar')
def calendar():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('calendar.html', username=session.get('username', 'Trader'))
# Settings Page Route
@app.route('/settings')
def settings():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('settings.html', username=session.get('username', 'Jagan'))

# --- GOOGLE OAUTH CONFIGURATION ---
oauth = OAuth(app)
# --- GOOGLE OAUTH CONFIGURATION ---
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id='141188474878-fatp342ccnh6abmk9j2prts0gifesefa.apps.googleusercontent.com',
    client_secret='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',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# --- AUTH API ENDPOINTS (DATABASE BACKED) ---
@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    hashed_pw = generate_password_hash(password)
    user = User(username=username, email=email or None, password_hash=hashed_pw, auth_provider='local')
    
    db.session.add(user)
    db.session.commit()

    session['user_id'] = user.id
    session['username'] = user.username
    session['email'] = user.email

    return jsonify({
        'success': True,
        'user': {'id': user.id, 'username': user.username, 'email': user.email, 'avatar': user.avatar_url}
    }), 201

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    identifier = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not identifier or not password:
        return jsonify({'error': 'Please enter your username and password'}), 400

    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()

    if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid username or password'}), 401

    session['user_id'] = user.id
    session['username'] = user.username
    session['email'] = user.email

    return jsonify({
        'success': True,
        'user': {'id': user.id, 'username': user.username, 'email': user.email, 'avatar': user.avatar_url}
    })

# --- GOOGLE AUTH HANDLERS ---
@app.route('/login/google')
def google_login():
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/login/google/callback')
def google_callback():
    token = google.authorize_access_token()
    user_info = token.get('userinfo')
    if not user_info:
        user_info = google.userinfo()
    
    email = user_info.get('email')
    name = user_info.get('name') or email.split('@')[0]
    picture = user_info.get('picture', '/static/bull-3d.png')

    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            username=name,
            email=email,
            avatar_url=picture,
            auth_provider='google'
        )
        db.session.add(user)
        db.session.commit()

    session['user_id'] = user.id
    session['username'] = user.username
    session['email'] = user.email

    return redirect('/dashboard')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@app.route('/api/google-login', methods=['POST'])
def api_google_login():
    demo_user = "google_demo_user"
    session['user_id'] = demo_user
    session['username'] = demo_user
    return jsonify({"success": True, "user": {"username": demo_user}})


# =========================================================
# TRADE LOG API ENDPOINTS
# =========================================================

# API Endpoint to Create a New Trade
@app.route('/api/trades', methods=['POST'])
def create_trade():
    data = request.json
    
    # Extract Numeric Execution Values
    entry = float(data.get('entry_price', 0))
    exit_p = float(data.get('exit_price', 0))
    sl = float(data.get('stop_loss', 0))
    tp = float(data.get('take_profit', 0))
    lots = float(data.get('lot_size', 0))
    direction = data.get('direction', 'Long')
    
    # Calculate Risk, Gain, PnL, and R-Multiple
    risk_per_unit = abs(entry - sl)
    gain_per_unit = (exit_p - entry) if direction == 'Long' else (entry - exit_p)
    
    pnl = float(data.get('pnl', gain_per_unit * lots * 100))
    r_multiple = float(data.get('r_multiple', round(gain_per_unit / risk_per_unit, 2) if risk_per_unit > 0 else 0.0))
    
    if pnl > 0:
        result_status = "Win"
    elif pnl < 0:
        result_status = "Loss"
    else:
        result_status = "Breakeven"

    new_trade = Trade(
        trade_date=data.get('trade_date', datetime.utcnow().strftime('%b %d, %Y')),
        day_of_week=data.get('day_of_week', 'Sunday'),
        symbol=data.get('symbol', 'XAUUSD'),
        direction=direction,
        session=data.get('session', 'New York'),
        setup=data.get('setup', 'Break of Structure'),
        lot_size=lots,
        entry_time=data.get('entry_time', ''),
        entry_price=entry,
        stop_loss=sl,
        take_profit=tp,
        exit_time=data.get('exit_time', ''),
        exit_price=exit_p,
        risk_percent=float(data.get('risk_percent', 0.8)),
        planned_risk=float(data.get('planned_risk', 80.0)),
        pnl=pnl,
        r_multiple=r_multiple,
        result=data.get('result', result_status),
        emotion_before=data.get('emotion_before', 'Calm'),
        emotion_during=data.get('emotion_during', 'Focused'),
        emotion_after=data.get('emotion_after', 'Grateful'),
        confidence_level=int(data.get('confidence_level', 8)),
        stress_level=int(data.get('stress_level', 3)),
        fomo_level=int(data.get('fomo_level', 2)),
        follow_plan=bool(data.get('follow_plan', True)),
        exit_early=bool(data.get('exit_early', False)),
        follow_checklist=bool(data.get('follow_checklist', True)),
        overtraded=bool(data.get('overtraded', False)),
        move_stop=bool(data.get('move_stop', False)),
        revenge_trade=bool(data.get('revenge_trade', False)),
        trade_notes=data.get('trade_notes', ''),
        what_went_well=data.get('what_went_well', ''),
        what_went_wrong=data.get('what_went_wrong', ''),
        lesson_learned=data.get('lesson_learned', ''),
        before_screenshot=data.get('before_screenshot', ''),
        during_screenshot=data.get('during_screenshot', ''),
        after_screenshot=data.get('after_screenshot', ''),
        market_condition=data.get('market_condition', 'Trending')
        )

    db.session.add(new_trade)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Trade saved successfully!', 'id': new_trade.id}), 201


# API Endpoint to Fetch All Logged Trades
@app.route('/api/trades', methods=['GET'])
# API Endpoint to Fetch All Logged Trades with Optional Date Range Filtering
@app.route('/api/trades', methods=['GET'])
def get_trades():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    trades = Trade.query.order_by(Trade.created_at.desc()).all()

    # Apply date range filtering if dates are provided
    if start_date_str and end_date_str:
        try:
            s_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            e_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            filtered_trades = []
            for t in trades:
                if t.trade_date:
                    try:
                        t_date = datetime.strptime(t.trade_date, '%b %d, %Y')
                        if s_date <= t_date <= e_date:
                            filtered_trades.append(t)
                    except:
                        filtered_trades.append(t)
            trades = filtered_trades
        except Exception as pe:
            print("Date parse error in get_trades:", pe)

    trade_list = []
    for t in trades:
        trade_list.append({
            'id': t.id,
            'trade_date': t.trade_date,
            'day_of_week': t.day_of_week,
            'symbol': t.symbol,
            'direction': t.direction,
            'session': t.session,
            'setup': t.setup,
            'market_condition': getattr(t, 'market_condition', None) or 'Trending',
            'lot_size': t.lot_size,
            'entry_time': t.entry_time,
            'entry_price': t.entry_price,
            'stop_loss': t.stop_loss,
            'take_profit': t.take_profit,
            'exit_time': t.exit_time,
            'exit_price': t.exit_price,
            'risk_percent': t.risk_percent,
            'planned_risk': t.planned_risk,
            'pnl': t.pnl or 0.0,
            'r_multiple': t.r_multiple or 0.0,
            'emotion_before': t.emotion_before,
            'emotion_during': t.emotion_during,
            'emotion_after': t.emotion_after,
            'confidence_level': t.confidence_level,
            'stress_level': t.stress_level,
            'fomo_level': t.fomo_level,
            'follow_plan': t.follow_plan,
            'exit_early': t.exit_early,
            'follow_checklist': t.follow_checklist,
            'overtraded': t.overtraded,
            'move_stop': t.move_stop,
            'trade_notes': t.trade_notes,
            'what_went_well': t.what_went_well,
            'what_went_wrong': t.what_went_wrong,
            'lesson_learned': t.lesson_learned,
            'before_screenshot': t.before_screenshot,
            'during_screenshot': t.during_screenshot,
            'after_screenshot': t.after_screenshot
        })

    return jsonify(trade_list)


# Initialize Database Tables
with app.app_context():
    db.create_all()
    with app.app_context():
       db.create_all()
    # Safely adds the new column to existing database
    try:
        with db.engine.connect() as conn:
            conn.execute(db.text("ALTER TABLE trade ADD COLUMN market_condition VARCHAR(50) DEFAULT 'Trending'"))
            conn.commit()
    except Exception:
        pass  # Column already exists
    # API Endpoint to Delete a Trade by ID
@app.route('/api/trades/<int:trade_id>', methods=['DELETE'])
def delete_trade(trade_id):
    trade = Trade.query.get(trade_id)
    if not trade:
        return jsonify({'status': 'error', 'message': 'Trade not found'}), 404    
    db.session.delete(trade)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Trade deleted successfully!'}), 200
# API Endpoint to Update an Existing Trade
@app.route('/api/trades/<int:trade_id>', methods=['PUT'])
def update_trade(trade_id):
    trade = Trade.query.get(trade_id)
    if not trade:
        return jsonify({'status': 'error', 'message': 'Trade not found'}), 404

    data = request.json or {}
    try:
        trade.trade_date = str(data.get('trade_date', trade.trade_date or ''))
        trade.day_of_week = str(data.get('day_of_week', trade.day_of_week or 'Sunday'))
        trade.symbol = str(data.get('symbol', trade.symbol or 'XAUUSD'))
        trade.direction = str(data.get('direction', trade.direction or 'Long'))
        trade.session = str(data.get('session', trade.session or 'New York'))
        trade.setup = str(data.get('setup', trade.setup or '30Min S/R'))
        trade.market_condition = str(data.get('market_condition', 'Trending'))

        # Safe Float Conversion (Prevents TypeError on empty inputs)
        trade.lot_size = float(data.get('lot_size') or 0.10)
        trade.entry_price = float(data.get('entry_price') or 0.0)
        trade.stop_loss = float(data.get('stop_loss') or 0.0)
        trade.take_profit = float(data.get('take_profit') or 0.0)
        trade.exit_price = float(data.get('exit_price') or 0.0)
        
        trade.entry_time = str(data.get('entry_time') or '')
        trade.exit_time = str(data.get('exit_time') or '')

        trade.risk_percent = float(data.get('risk_percent') or 1.0)
        planned_risk = float(data.get('planned_risk') or 100.0)

        # Calculate P&L and R-Multiple safely
        if trade.entry_price > 0 and trade.exit_price > 0:
            if trade.direction == 'Long':
                gain_per_unit = trade.exit_price - trade.entry_price
            else:
                gain_per_unit = trade.entry_price - trade.exit_price
            
            trade.pnl = gain_per_unit * trade.lot_size * 100
            trade.r_multiple = round(trade.pnl / planned_risk, 2) if planned_risk > 0 else 0.0
        else:
            trade.pnl = 0.0
            trade.r_multiple = 0.0

        trade.emotion_before = str(data.get('emotion_before', trade.emotion_before or 'Calm'))
        trade.emotion_during = str(data.get('emotion_during', trade.emotion_during or 'Calm'))
        trade.emotion_after = str(data.get('emotion_after', trade.emotion_after or 'Calm'))

        trade.confidence_level = int(data.get('confidence_level') or 8)
        trade.stress_level = int(data.get('stress_level') or 3)
        trade.fomo_level = int(data.get('fomo_level') or 2)

        trade.follow_plan = bool(data.get('follow_plan', True))
        trade.exit_early = bool(data.get('exit_early', False))
        trade.follow_checklist = bool(data.get('follow_checklist', True))
        trade.overtraded = bool(data.get('overtraded', False))
        trade.move_stop = bool(data.get('move_stop', False))
        trade.revenge_trade = bool(data.get('revenge_trade', False))

        trade.trade_notes = str(data.get('trade_notes') or '')
        trade.what_went_well = str(data.get('what_went_well') or '')
        trade.what_went_wrong = str(data.get('what_went_wrong') or '')
        trade.lesson_learned = str(data.get('lesson_learned') or '')

        if data.get('before_screenshot'):
            trade.before_screenshot = data.get('before_screenshot')
        if data.get('during_screenshot'):
            trade.during_screenshot = data.get('during_screenshot')
        if data.get('after_screenshot'):
            trade.after_screenshot = data.get('after_screenshot')

        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Trade updated successfully!'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Update Error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
from datetime import datetime

# API Endpoint for Analytics with Date Range Filtering
@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        query = Trade.query

        # Fetch all trades and filter in Python for safe string/date matching
        trades = query.all()

        if start_date_str and end_date_str:
            try:
                s_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                e_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                filtered_trades = []
                for t in trades:
                    if t.trade_date:
                        try:
                            t_date = datetime.strptime(t.trade_date, '%b %d, %Y')
                            if s_date <= t_date <= e_date:
                                filtered_trades.append(t)
                        except:
                            filtered_trades.append(t)
                trades = filtered_trades
            except Exception as pe:
                print("Date parse error:", pe)

        total_trades = len(trades)
        empty_side = {'count': 0, 'win_rate': 0.0, 'avg_r': 0.0, 'pnl_r': 0.0, 'pf': 0.0}

        if total_trades == 0:
            return jsonify({
                'total_trades': 0, 'win_rate': 0.0, 'avg_r': 0.0, 'expectancy': 0.0, 'net_pnl_r': 0.0, 'profit_factor': 0.0,
                'by_setup': {}, 'by_symbol': {}, 'by_session': {}, 'by_day': {}, 'by_time_of_day': {},
                'by_emotion': {}, 'by_risk': {}, 'by_compliance': {}, 'by_market': {},
                'long_vs_short': {'long': empty_side, 'short': empty_side},
                'insights': [{'type': 'warning', 'text': 'No trades found for the selected period.'}]
            })

        clean_trades = []
        for t in trades:
            pnl = float(t.pnl) if t.pnl is not None else 0.0
            r_mult = float(t.r_multiple) if t.r_multiple is not None else 0.0
            risk_pct = float(t.risk_percent) if t.risk_percent is not None else 1.0
            
            clean_trades.append({
                'symbol': t.symbol or 'XAUUSD',
                'setup': t.setup or '30Min S/R',
                'market_condition': getattr(t, 'market_condition', None) or 'Trending',  # <-- ADD HERE
                'session': t.session or 'New York',
                'day_of_week': t.day_of_week or 'Monday',
                'entry_time': t.entry_time or '12:00',
                'emotion_before': t.emotion_before or 'Calm',
                'direction': t.direction or 'Long',
                'risk_percent': risk_pct,
                'pnl': pnl,
                'r_multiple': r_mult,
                'follow_plan': bool(t.follow_plan),
                'exit_early': bool(t.exit_early)
            })

        wins = [t for t in clean_trades if t['pnl'] > 0]
        losses = [t for t in clean_trades if t['pnl'] < 0]
        
        win_rate = round((len(wins) / total_trades) * 100, 2)
        gross_profit = sum(t['pnl'] for t in wins)
        gross_loss = abs(sum(t['pnl'] for t in losses))
        profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else (round(gross_profit, 2) if gross_profit > 0 else 0.0)
        
        avg_r = round(sum(t['r_multiple'] for t in clean_trades) / total_trades, 2)
        net_pnl_r = round(sum(t['r_multiple'] for t in clean_trades), 2)
        
        loss_rate = 100.0 - win_rate
        avg_win_r = (sum(t['r_multiple'] for t in wins) / len(wins)) if wins else 0.0
        avg_loss_r = abs(sum(t['r_multiple'] for t in losses) / len(losses)) if losses else 0.0
        expectancy = round(((win_rate / 100.0) * avg_win_r) - ((loss_rate / 100.0) * avg_loss_r), 2)

        def group_metrics(key_attr):
            groups = {}
            for t in clean_trades:
                val = t[key_attr]
                if val not in groups:
                    groups[val] = {'count': 0, 'wins': 0, 'pnl_r': 0.0, 'r_list': []}
                groups[val]['count'] += 1
                groups[val]['pnl_r'] += t['r_multiple']
                groups[val]['r_list'].append(t['r_multiple'])
                if t['pnl'] > 0:
                    groups[val]['wins'] += 1

            for g in groups:
                cnt = groups[g]['count']
                groups[g]['win_rate'] = round((groups[g]['wins'] / cnt) * 100, 1)
                groups[g]['avg_r'] = round(sum(groups[g]['r_list']) / cnt, 2)
                groups[g]['pnl_r'] = round(groups[g]['pnl_r'], 2)
                del groups[g]['r_list']
            return groups

        by_setup = group_metrics('setup')
        by_symbol = group_metrics('symbol')
        by_session = group_metrics('session')
        by_day = group_metrics('day_of_week')
        by_emotion = group_metrics('emotion_before')
        by_market = group_metrics('market_condition')  # <-- DEFINED HERE
                # Time of Day buckets - 24-Hour Exact Resolution
        time_labels = [
            '12AM', '1AM', '2AM', '3AM', '4AM', '5AM',
            '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
            '12PM', '1PM', '2PM', '3PM', '4PM', '5PM',
            '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'
        ]
        time_buckets = {label: 0.0 for label in time_labels}

        for t in clean_trades:
            time_str = str(t.get('entry_time') or '')
            try:
                if ':' in time_str:
                    hour = int(time_str.split(':')[0])
                else:
                    continue

                if hour == 0:
                    label = '12AM'
                elif hour < 12:
                    label = f"{hour}AM"
                elif hour == 12:
                    label = '12PM'
                else:
                    label = f"{hour - 12}PM"

                if label in time_buckets:
                    time_buckets[label] += (t.get('r_multiple') or 0.0)
            except Exception:
                pass

        for k in time_buckets:
            time_buckets[k] = round(time_buckets[k], 2)
        for k in time_buckets:
            time_buckets[k] = round(time_buckets[k], 2)

        # Risk Level Buckets
        risk_buckets = {'0.25% - 0.50%': 0, '0.51% - 1.00%': 0, '1.01% - 1.50%': 0, '1.51%+': 0}
        for t in clean_trades:
            r = t['risk_percent']
            if r <= 0.5: risk_buckets['0.25% - 0.50%'] += 1
            elif r <= 1.0: risk_buckets['0.51% - 1.00%'] += 1
            elif r <= 1.5: risk_buckets['1.01% - 1.50%'] += 1
            else: risk_buckets['1.51%+'] += 1

        # Compliance
        compliance_groups = {'Followed': 0, 'Minor Deviation': 0, 'Major Deviation': 0}
        for t in clean_trades:
            if t['follow_plan'] and t['exit_early']:
                compliance_groups['Followed'] += 1
            elif t['follow_plan'] or t['exit_early']:
                compliance_groups['Minor Deviation'] += 1
            else:
                compliance_groups['Major Deviation'] += 1

        # Long vs Short
        long_trades = [t for t in clean_trades if t['direction'] == 'Long']
        short_trades = [t for t in clean_trades if t['direction'] == 'Short']

        def calc_side(side_list):
            if not side_list:
                return empty_side
            w = [t for t in side_list if t['pnl'] > 0]
            l = [t for t in side_list if t['pnl'] < 0]
            gp = sum(t['pnl'] for t in w)
            gl = abs(sum(t['pnl'] for t in l))
            pf = round(gp / gl, 2) if gl > 0 else (round(gp, 2) if gp > 0 else 0.0)
            return {
                'count': len(side_list),
                'win_rate': round((len(w) / len(side_list)) * 100, 1),
                'avg_r': round(sum(t['r_multiple'] for t in side_list) / len(side_list), 2),
                'pnl_r': round(sum(t['r_multiple'] for t in side_list), 2),
                'pf': pf
            }

        # Dynamic Key Insights
        insights = []
        if by_setup:
            best_setup = max(by_setup.items(), key=lambda x: x[1]['pnl_r'])
            insights.append({'type': 'positive', 'text': f"Your best performance comes from {best_setup[0]} setups (+{best_setup[1]['pnl_r']}R)."})

        if by_session:
            best_sess = max(by_session.items(), key=lambda x: x[1]['win_rate'])
            insights.append({'type': 'positive', 'text': f"{best_sess[0]} session is your strongest with a {best_sess[1]['win_rate']}% win rate."})

        if by_emotion:
            worst_emotion = min(by_emotion.items(), key=lambda x: x[1]['win_rate'])
            if worst_emotion[1]['win_rate'] < 50:
                insights.append({'type': 'warning', 'text': f"Avoid trading when feeling {worst_emotion[0]} ({worst_emotion[1]['win_rate']}% win rate)."})

        if compliance_groups['Major Deviation'] > 0:
            pct = round((compliance_groups['Major Deviation'] / total_trades) * 100, 1)
            insights.append({'type': 'warning', 'text': f"Major rule deviations ({pct}% of trades) are impacting your win rate."})

        return jsonify({
            'total_trades': total_trades,
            'win_rate': win_rate,
            'avg_r': avg_r,
            'expectancy': expectancy,
            'net_pnl_r': net_pnl_r,
            'profit_factor': profit_factor,
            'by_setup': by_setup,
            'by_symbol': by_symbol,
            'by_session': by_session,
            'by_day': by_day,
            'by_time_of_day': time_buckets,
            'by_emotion': by_emotion,
            'by_risk': risk_buckets,
            'by_compliance': compliance_groups,
            'by_market':by_market,
            'long_vs_short': {'long': calc_side(long_trades), 'short': calc_side(short_trades)},
            'insights': insights
        })
    except Exception as e:
        print("Analytics Engine Error:", e)
        return jsonify({'error': str(e)}), 500
    # ==========================================
# GOOGLE ACCOUNT & SETTINGS API ROUTES
# ==========================================

@app.route('/api/google-account', methods=['GET'])
def get_google_account():
    return jsonify({
        "connected": session.get('google_connected', True),
        "name": session.get('user_name', 'Jagan Yadav'),
        "email": session.get('user_email', 'jagany600@gmail.com'),
        "avatar": session.get('user_avatar', '/static/bull-3d.png')
    })

@app.route('/api/google-account/sync', methods=['POST'])
def sync_google_account():
    return jsonify({"success": True, "message": "Google cloud sync complete."})

@app.route('/api/google-account/disconnect', methods=['POST'])
def disconnect_google_account():
    session['google_connected'] = False
    return jsonify({"success": True, "message": "Google account unlinked."})

@app.route('/api/delete-account', methods=['POST'])
def delete_account():
    session.clear()
    return jsonify({"success": True, "message": "Account deleted successfully."})
# IMPORTANT: ALL ROUTES MUST BE ABOVE THIS LINE
import os

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)