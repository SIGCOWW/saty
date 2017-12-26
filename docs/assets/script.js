$(function(){
	var TEST_MODE = (location.hash == '#test');
	if (TEST_MODE) alert('TEST_MODE');

	var param = null;
	try {
		param = JSON.parse(decodeURIComponent(location.search.replace('?data=', '')));
	} catch (e) { console.log('nice catch'); }

	if (param && param['status'] == 'error') {
		alert('Square: ' + param['error_code'])
	}


	var TIMEOUT, SAMPLE_POS = 0, SAMPLE_IMG = window.localStorage.getItem('sample');
	if (!SAMPLE_IMG) {
		function kick() { };
	} else {
		function kick() {
			if (TIMEOUT) {
				clearTimeout(TIMEOUT);
				TIMEOUT = null;
			}

			TIMEOUT = setTimeout(function() {
				var img = new Image();
				img.onload = function() {
					$('#sample').width(Math.floor(img.width * (window.innerHeight / img.height) + window.innerWidth));
					$('#sample').height(window.innerHeight);
					$("#sample").show();
				}
				img.src = SAMPLE_IMG;
			}, 60000);
		}

		$('#sample').css('background-image', 'url('+SAMPLE_IMG+')');
		$('#sample').hammer().on('tap', function() {
			kick();
			$(this).hide();
		});
		kick();
	}

	$("article").hammer().on('tap', function() {
		kick();
		var amount = $(this).find(".amount");
		if (amount.length > 0) {
			var val = parseInt(amount.text());
			amount.text(val + 1);
		} else {
			$("section#methods article").each(function(i, elem) {
				if ($(elem).hasClass('active')) $(elem).removeClass('active');
			});
		}

		if (!$(this).hasClass('active')) $(this).addClass('active');
	});

	$("article").hammer().on('press', function() {
		kick();
		var amount = $(this).find(".amount");
		if (amount.length > 0) amount.text("0");
		$(this).removeClass('active');
	});


	$("html").hammer().data('hammer').get('swipe').set({direction: Hammer.DIRECTION_ALL});
	$("html").hammer().on('swipe', function(ev) {
		if (!$(this).is(ev.target)) return true;
		if ($('#sample').is(':visible') || $('#qrcode').is(':visible')) return true;
		kick();

		var items = [];
		$("section#items article").each(function(i, elem) {
			var amount = parseInt($(elem).find('.amount').text());
			if (amount > 0) {
				items.push({
					'title': $(elem).find('.title').text(),
					'price': parseInt($(elem).find('.price').text()),
					'amount': amount,
					'index': i
				});
			}
		});
		var method = $("section#methods article.active").prop('id');

		if (items.length == 0 || !method) {
			alert('支払い情報不足');
			return true;
		}

		$(".amount").text('0');
		$("article").removeClass('active');
		payment(items, method);
	});

	$("#qrcode").hammer().on('tap', function() {
		kick();
		$(this).hide();
		location.reload(); // スライドショーがおかしくなるのを防ぐ苦肉の策
	});


	function payment(items, method) {
		function saty(param) {
			var host = window.localStorage.getItem('saty');
			if (host) $.get('https://' + host + '/', param);
		}

		var sum = 0;
		$.each(items, function(i, arr) {
			sum += arr['price'] * arr['amount'];
		});

		saty({'method':method, 'amount':sum});
		if (method == 'wechat') {
			var cny = (sum / 500) * 25;
			$("#qrcode img").attr('src', './assets/qrcode.jpg');
			$("#qrcode p").html(cny + ' CNY (&yen;' + cny + ') 送金してください');
			$("#qrcode").show();
			clearTimeout(TIMEOUT);
			TIMEOUT = null;
			return;
		}

		var uri;
		var keys = [ 100, 'q', 1500 ];
		if (method == 'square') {
			var appid = window.localStorage.getItem('square');
			if (!appid) {
				alert('Squareの設定がない');
				return;
			}

			var param = {
				'amount_money': {
					'amount': TEST_MODE ? 100 : sum,
					'currency_code': 'JPY'
				},
				'callback_url': 'https://sigcoww.github.io/saty/',
				'client_id': appid,
				'version': '1.3',
				'options' : {
					'supported_tender_types': ['CREDIT_CARD', 'CASH', 'OTHER', 'SQUARE_GIFT_CARD', 'CARD_ON_FILE']
				}
			};

			uri = 'square-commerce-v1://payment/create?data=' + encodeURIComponent(JSON.stringify(param));
		} else if (method == 'pxvpay') {
			$.each(items, function(i, arr) {
				var key = 'asdfghjkl'[arr['index']];
				for (var i=0; i<arr['amount']; i++) {
					keys.push(key);
					keys.push(50);
				}
			});
			keys.push('e');
			uri = 'serval://';
		}

		saty({'keys[]': keys});
		window.location = uri;
	}
});
