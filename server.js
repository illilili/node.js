const express = require('express');
const app = express();
app.use(express.urlencoded({extended:true}));
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
require('dotenv').config()

var db;

MongoClient.connect(process.env.DB_URL, function(에러, client){
  if(에러) return console.log(에러)
  db = client.db('todoapp');


  app.listen(process.env.PORT, function(){
    console.log('listening on 7070')
  });

})

// ctrl+C로 서버 끔


app.get('/',function(요청, 응답){
  응답.render(__dirname + '/views/index.ejs')
});



app.get('/write',function(요청, 응답){
  응답.render(__dirname + '/views/write.ejs')
});

app.post('/register', function (요청, 응답) {
  db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw }, function (에러, 결과) {
    응답.redirect('/')
  })
})

app.post('/add', function (요청, 응답) {
  console.log(요청.user._id)
  응답.send('전송완료');
  db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
    var 총게시물갯수 = 결과.totalPost;
    var post = { _id: 총게시물갯수 + 1, 작성자: 요청.user._id , 제목: 요청.body.title, 날짜: 요청.body.date }
    db.collection('post').insertOne( post , function (에러, 결과) {
      db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
        if (에러) { return console.log(에러) }
      })
    });
  });
});


app.get('/list', function(요청, 응답){
  db.collection('post').find().toArray(function(에러, 결과){
    console.log(결과);
    응답.render('list.ejs', { posts: 결과 });
  });
});

app.get('/search', (요청, 응답)=>{

  var 검색조건 = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: 요청.query.value,
          path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        }
      }
    }
  ] 

  console.log(요청.query);
  db.collection('post').aggregate(검색조건).toArray((에러, 결과)=>{
    console.log(결과)
    응답.render('search.ejs', {posts : 결과})
  })
})

app.delete('/delete', function (요청, 응답) {
  요청.body._id = parseInt(요청.body._id);
  //요청.body에 담겨온 게시물번호를 가진 글을 db에서 찾아서 삭제해주세요
  db.collection('post').deleteOne({_id : 요청.body._id, 작성자 : 요청.user._id }, function (에러, 결과) {
    console.log('삭제완료');
    console.log('에러',에러)
    응답.status(200).send({ message: '성공했습니다' });
  })
});


app.get('/detail/:id', function(요청, 응답){
  요청.params._id = parseInt(요청.params._id);
  db.collection('post').findOne({_id : parseInt(요청.params.id)}, function(에러, 결과){
    console.log(결과);
    응답.render('detail.ejs', { data : 결과 });
  })

  
})


app.get('/edit/:id', function(요청, 응답){
  // 게시물의 제목과 날짜
  db.collection('post').findOne({_id : parseInt(요청.params.id)}, function(에러, 결과){
    console.log(결과);
    응답.render('edit.ejs',{ post : 결과 });
  })
  
})

app.put('/edit', function(요청, 응답){
  //폼에 담긴 데이터를 가지고 db에 업데이트
  db.collection('post').updateOne({ _id : parseInt(요청.body.id)},{ $set : { 제목 : 요청.body.title, 내용 : 요청.body.date }}, function(에러, 결과){
    console.log('수정완료');
    응답.redirect('/list');
    

  })

});

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function(요청, 응답){
  응답.render('login.ejs');

});

app.post('/login', passport.authenticate('local', {
  failureRedirect : '/fail'
}), function(요청, 응답){
  // 로그인 성공 하면 홈으로 감
  응답.redirect('/');


});

app.get('/mypage', 로그인했니, function(요청, 응답){
  console.log(요청.user);
  응답.render('mypage.ejs', {사용자 : 요청.user});
});

function 로그인했니(요청, 응답, next){
  if (요청.user){
    next();
  }else {
    응답.send('로그인하세요');
  }
}



// LocalStrategy 인증방식
passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  //console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    if (에러) return done(에러)

    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
    if (입력한비번 == 결과.pw) {
      return done(null, 결과)
    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })

}));

// 로그인 세션 유지
passport.serializeUser(function(user, done){
  done(null, user.id)
});

passport.deserializeUser(function(아이디, done){
  db.collection('login').findOne({ id : 아이디 }, function(에러, 결과){
    done(null, 결과)
  })
});