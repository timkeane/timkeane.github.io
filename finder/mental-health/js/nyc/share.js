/**
 * Class for providing a set of buttons for social media sharing.
 * @export
 * @constructor
 * @param {string|Element} target
 */
nyc.Share = function(target, feedbackUrl){
	var me = this, html = nyc.Share.HTML, title = $('meta[property="og:title"]').attr('content');
	html = html.replace(/\${url}/g, $('meta[property="og:url"]').attr('content'));
	html = html.replace(/\${title}/g, title);
	html = html.replace(/\${feedbackUrl}/, feedbackUrl);
	html = html.replace(/\${description}/g, $('meta[property="og:description"]').attr('content'));
	$(target).append(html).trigger('create');
	if (!feedbackUrl) $('#feedback-btn').remove();
	$('*').click(function(e){
		if ($('#share-btns').css('opacity') == 1)
			$('#share-btns').fadeOut();
	});
	if (this.isIosAppMode()){
		$('#email-btn').attr('target', '_blank');
	}
};

nyc.Share.prototype.isIosAppMode = function(){
	return navigator.standalone && navigator.userAgent.match(/(iPad|iPhone|iPod|iOS)/g);
};

nyc.Share.HTML = 
	'<a id="share-btn" class="ctl ctl-btn" data-role="button" title="Share..." onclick="$(\'#share-btns\').fadeToggle();">' +
		'<span class="noshow">Share...</span>' +
	'</a>' +
	'<div id="share-btns" class="ctl">' +
		'<a id="feedback-btn" class="ctl-btn" data-role="button" href="${feedbackUrl}" target="_blank" title="Feedback">' +
			'<span class="noshow">Feedback</span>' +
		'</a>' +
		'<a id="facebook-btn" class="ctl-btn" data-role="button" href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" title="Facebook">' +
			'<span class="noshow">Facebook</span>' +
		'</a>' +
		'<a id="twitter-btn" class="ctl-btn" data-role="button" href="https://twitter.com/intent/tweet?text=${url} @nycgov&source=webclient" target="_blank" title="Twitter">' +
			'<span class="noshow">Twitter</span>' +
		'</a>' +
		'<a id="google-btn" class="ctl-btn" data-role="button" href="https://plus.google.com/share?url=${url}" target="_blank" title="Google+">' +
			'<span class="noshow">Google+</span>' +
		'</a>' +
		'<a id="linkedin-btn" class="ctl-btn" data-role="button" href="http://www.linkedin.com/shareArticle?mini=true&url=${url}" target="_blank" title="LinkedIn">' +
			'<span class="noshow">LinkedIn</span>' +
		'</a>' +
		'<a id="tumblr-btn" class="ctl-btn" data-role="button" href="http://www.tumblr.com/share/link?url=${url}&name=${title}&description=via%20NYC.gov" target="_blank" title="Tumblr">' +
			'<span class="noshow">Tumblr</span>' +
		'</a>' +
		'<a id="email-btn" class="ctl-btn" data-role="button" href="mailto:?subject=${title}&body=${description}%0A%0A${url}" title="email">' +
			'<span class="noshow">Email</span>' +
		'</a>' +
	'</div>';
