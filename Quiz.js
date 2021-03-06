//================================================================================
// File: 		Quiz.js
// Description: Presents review quizzes
// Version: 	1.0
// Author: 		Rich Albers
//
//================================================================================


//================================================================================
//Constants 
//id's and/or classes of items hard coded in html file
var TOPICS = "#topics";

var QUIZ = "#quiz";
var QUIZ_TITLE = "#quizTitle";
var QUESTION = "#question";
var QUESTION_NUMBER = "#questionNumber";
var ANSWERS = "#answers";
var RESULT_MSG = "#resultMsg";
var HELP = "#help";
var EXPLANATION = "#explanation";

var GOTO_NEXT = "#next";
var GOTO_PREV = "#prev"
var BUTTON_HELP = "#helpButton";
var BUTTON_CHECK = "#answerButton";
var BUTTON_NEXT = "#nextButton";

//=====================================================================================
//quiz object
var oQuiz=new Quiz();
/*  Quiz object is built in loadQuestions() and looks like this:
{ 
	//all the potential questions for the quizzes (loaded from spreadsheet)
	aAllQuestions: [
		{
			topic: 	  "bla",
			subTopic: "bla",
			question: "bla bla bla",
			answers: [
				{	text: "bla bla bla";  correct: true/false;  explanation: "bla bla bla" },
				{	text: "bla bla bla";  correct: true/false;  explanation: "bla bla bla" },
				{	text: "bla bla bla";  correct: true/false;  explanation: "bla bla bla" }			
			],
			help: "bla bla bla",
			explanation: "bla bla bla" ,
			correct: false,
			showOnlyIncorrect: false,
			lineNum: 123	//associated line in spreadsheet
			dispType: "S" = sequential (the default) shown if user clicks on single subcategory (or "surprise me")
					  "R" = random - shown only if user selects "surprise me")
		},
		...
	]
	//a subset of the potential questions that are being used for the current quiz
	aQuizQuestions: [
		..
	]

	iCurrQst: X;	//index of question currently being displayed
}
*/

//---------------------------------------------------------------------
// get specified URL parameter
function GetUrlParam(name){
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
	if (results != null)
		return results[1];
	else
		return null;
}
//--------------------------------------------------------------------
$(document).ready(function()
{ 	
	//$('#answerFooter').append('<div id="lineNum" style="position: absolute; bottom: 0; left: 0">zz</div>');
	//$('#quiz').append('<div id="lineNum" style="float: left;"></div>');
	
	//hide existing not-yet-needed elements
	hideButtonsAndMessages();
	displayInstructions();
	
	// load all questions from google spreadsheet (and build topic last)
	var spreadsheetID = GetUrlParam('id');
	if (spreadsheetID == null)
		spreadsheetID = "1um2uxlZF56-JufxIB6_9Wo5qwOP7p77o4-RHQoedQoA"; // test database
	
	oQuiz = new Quiz; 
	oQuiz.getAndProcessQuestionData(spreadsheetID);	//Note: returns before completion (asyncronous!)
	
	//configure all event handlers ---------------------------------------
	
	$('body').keypress( function(event) {
		if (String.fromCharCode(event.which) == 'd')
			alert("'d' has been deprecated!\nUse 'a' to download all quiz data.\nUse 's' to download only the visible (i.e. open) sections");
		if (String.fromCharCode(event.which) == 'a')
			if (confirm('Download all quiz data as .gift file?'))
				oQuiz.downloadAsGift([]); //Note: empty array parameter causes ALL sections to be download
		if (String.fromCharCode(event.which) == 's') {
			//get list of open topics
			var aTopics = new Array;
			$('#topics ul').each( function () {
				if ($(this).css("display") != "none")	  //those displayed
					aTopics.push( $(this).prev().html() ); //topic title (h3)
			})
			if (aTopics.length < 1)
				alert('No Topics selected.\nPlease select the topics to download by expanding them in the topic list.');
			else if (confirm("Download the following section's data as .gift file:\n  *" + (" " + aTopics).replace(/\,/g, "\n  * ") )) {
				oQuiz.downloadAsGift(aTopics);
			}
		}
	});
	
	//topic selected from list
	$(TOPICS).on("click", "h3", function() {
		$(this).next().slideToggle();
	});
	
	//quiz selected from list (either subtopic or random button)
	$(TOPICS).on("click", ".contentLink", function() {
		//unselect all other topics 
		$(TOPICS + " .selected").each(function () {$(this).removeClass("selected");});
		
		//highlight the subcategory (or button) selected
		$(this).addClass("selected");
		//highlight category(s) slelcted
		if ( $(this).hasClass("randomAll") )
			$('.topic').addClass("selected"); // all topics
		else
			$(this).parent().parent().addClass("selected"); //grandparent is topic container
			//  Note: prev line only works for button in topic because button is in ul. (which it shouldn't be!)
			//  To Fix: add topic to topic div as data (or id) and found that way.  Probably.
		
		//quiz title will be "Category: subCategory"
		var topic=$(this).attr("data-topic");
		var subTopic=$(this).attr("data-subTopic");
		$(QUIZ_TITLE).html(topic + ": " + subTopic); 
		
		//display quiz
		hideButtonsAndMessages();
		//$(ANSWERS).html();
		$(BUTTON_CHECK).show();
		$(QUIZ).show();
		$(GOTO_NEXT).show();
		$(GOTO_PREV).show();
		
		if ( $(this).hasClass("randomAll") ) {
			oQuiz.mode = "rand";
			oQuiz.selectQuestions("", "", "");
			oQuiz.aQuizQuestions.sort(function(a, b){return 0.5 - Math.random()}); //randmomize order
		} else if ($(this).hasClass("randomInTopic") ) { 
			oQuiz.mode = "rand";
			oQuiz.selectQuestions(topic, "", "");
			oQuiz.aQuizQuestions.sort(function(a, b){return 0.5 - Math.random()}); //randomize order
		}
		else {
			oQuiz.mode = "seq";
			oQuiz.selectQuestions(topic, subTopic, "S");
		}
		
		oQuiz.iCurrQst=-1; //is incremented before used
		oQuiz.showOnlyIncorrect=false;
		oQuiz.displayNextQuestion();
	});
	
	//Question Navigation (arrows at top right of question window)
	//TODO fix the GOTO_PREV button to work properly when in "take those you missed" mode.
	//TODO fix the GOTO_PREV button to work when quiz summary is displayed
	$(GOTO_NEXT).on("click", function() {
		//do the same thing as the "Next Question" button
		$(BUTTON_NEXT).trigger("click");
	});
	
	$(GOTO_PREV).on("click", function() {
		//Kind of a kludge.  If possible, back up 2, then act like "Next Question" button was pressed.
		if (oQuiz.iCurrQst>0) {
			oQuiz.iCurrQst-=2;  //might make it -1, but it's incremented before being used. Remain calm.
			$(BUTTON_NEXT).trigger("click");
		};
	});
	
	//Quiz Elements 
	$(ANSWERS).on("click", "div.answer", function() {
		//if question has been answered, clicks are ignored
		if ($(this).hasClass("correct") || $(this).hasClass("incorrect")) 
			return;
		
		$(this).toggleClass("selected");
	});

	$(BUTTON_HELP).on("click", function() {
		$(HELP).toggle();
	});
	
	$(BUTTON_CHECK).on("click", function() {
		hideButtonsAndMessages();
		oQuiz.checkAnswers();
		$(RESULT_MSG).show();
		$(EXPLANATION).show();
		$(BUTTON_NEXT).show();
	});
	
	$(BUTTON_NEXT).on("click", function() {
		//erase any current info in display areas
		hideButtonsAndMessages();
		$(QUESTION).html("");
		$(ANSWERS).html("");
		//display next question, or "the end." msg
		if (oQuiz.displayNextQuestion()) {				
			$(BUTTON_CHECK).show();
		} else {
			var totCorrect=0;
			var totQuestions=oQuiz.aQuizQuestions.length;
			for (var x=0; x<oQuiz.aQuizQuestions.length; x++) {
				if (oQuiz.aQuizQuestions[x].correct == true)
					totCorrect++;
			}
			$(QUESTION).html("You've come to the end of the questions for this topic.<br><br>" 
			  + "You answered " + totCorrect + " out of " + totQuestions + " questions correctly.<br>");
			if (totCorrect != totQuestions)
				$(QUESTION).append("<button id='retry'>Retry the missed questions</button> or");
			$(QUESTION).append("<br>&lArr;pick another topic from the list on the left.");	

			$("#retry").click( function() {
				oQuiz.iCurrQst=-1; //incremented before used.
				oQuiz.showOnlyIncorrect=true;
				$(BUTTON_CHECK).show();
				oQuiz.displayNextQuestion();
			});		
		}
	});
	
	//configure text message to appear above answer mark (sad face) explaining the problem
	$('body').append("<div id='popupExplanation'></div>");
	$('#popupExplanation').hide();
	$(ANSWERS).on('mouseenter', 'img', function() {
		$('#popupExplanation').html($(this).parent().data("explanation"));
		$('#popupExplanation').show();
		var p = $(this).offset();
		$('#popupExplanation').offset({top: p.top-35, left: p.left-10 }); //place above img
	});
	$(ANSWERS).on('mouseout', 'img', function() {
		$('#popupExplanation').hide();
	});
	
	//configure text message to appear above answer explaining the problem
	// TODO maybe? combine this with previous block - they're almost identical.
	$(ANSWERS).on('mouseenter', '.correct, .incorrect', function() {
		$('#popupExplanation').html($(this).data("explanation"));
		$('#popupExplanation').show();
		var p = $(this).offset();
		var height = $('#popupExplanation').height();
		$('#popupExplanation').offset({top: p.top-height-10, left: p.left+10 }); //place above ans
	});
	$(ANSWERS).on('mouseleave', '.correct, .incorrect', function() {
		$('#popupExplanation').hide();
	});
	
});

//------------------------------------------------------------------
function hideButtonsAndMessages() {
	//messages
	$(HELP).hide();
	$(RESULT_MSG).hide();
	$(EXPLANATION).hide();
	$('#popupExplanation').hide();
	
	//buttons
	$(BUTTON_HELP).hide();
	$(BUTTON_CHECK).hide();
	$(BUTTON_NEXT).hide();
}

//------------------------------------------------------------------
function displayInstructions() {
	var msg="<p>&#8678; Select a topic, then subtopic, from the Topics list.<p><br>";

	msg+="<p>When a topic/subtopic is selected, you'll be presented a set of questions.  After answering all of them, you'll be given the opportunity to retry those you missed.</p><br>";
	msg+="<p>Clicking on \"surprise me\" will show you all the questions in that topic in random order, including possibly some questions not displayed previously.  The question order, as well as the answer order, will be randomized.</p><br>";
	msg+="<p>It's recommended that you first go through all the questions in a topic in order and take the time to research any that you miss.  Then use the category's \"surprise me!\" button to test/verify your understanding of the topic.</b><br>";
	$(QUESTION).html(msg);
}
//================================================================================
// Quiz class
// depends on a bunch of constants 

function Quiz() {
	this.title="";
	this.aAllQuestions = new Array;	//array of all possible questions (each question consists of text and an array of answers)
	this.aQuizQuestions = new Array; //array of question on current quiz
	this.iCurrQst = -1;				//index of question currently displayed
	this.mode=""; 					//will be set to "seq" (sequential) or "rand" (random)
}

//--------------------------------------------------------------------------------------------- 
// copies questions to be on quiz into aQuizQestions array
//--------------------------------------------------------------------------------------------- 
Quiz.prototype.selectQuestions = function(topic, subTopic, dispType) {
	this.aQuizQuestions = []
	//slecting all
	for (var x=0; x<this.aAllQuestions.length; x++)
		if ((topic == "" || this.aAllQuestions[x].topic == topic )
		&& (subTopic == "" || this.aAllQuestions[x].subTopic == subTopic )
		&& (dispType == "" || this.aAllQuestions[x].dispType == dispType))
			this.aQuizQuestions.push(this.aAllQuestions[x]);

}

//------------------------------------------------------------------------------------------
// load data from google spreadsheet into global question array
// When the function COMPLETES:
//		oQuiz contains all the questions from the given spreadsheet (see object details above)
//  	The topic list (html) is complete
//
//  BUT, the function RETURNS before it's COMPLETE as almost it's entire functionality
// 		  is contained in an ansyncronous AJAX call
// ------------------------------------------------------------------------------------------
Quiz.prototype.getAndProcessQuestionData = function(spreadsheetID) {
	var me=this;
	
	me.title="";
	me.showOnlyIncorrect=false;
	
	// get data from google spreadsheet
	// Spreadsheet must be published to the web. (only the worksheet with the questions)
	//https://docs.google.com/spreadsheets/d/1uEKeONFN2a3X304kH0J3YKYNMU6c_OuiN6fFEr55w0M/edit?usp=sharing
	//https://docs.google.com/spreadsheets/d/1uEKeONFN2a3X304kH0J3YKYNMU6c_OuiN6fFEr55w0M/pubhtml

	var url = "https://spreadsheets.google.com/feeds/list/" + spreadsheetID + "/od6/public/values?alt=json";
	
	$.getJSON(url, function(data) {	
		//use sheet title (FWIW, there appears to be no access to filename)
		me.title=data.feed.title.$t;
		$('h1').html(me.title);
		
		//load questions and build topic list
		me.loadQuestions(data);
		me.buildTopicList();
		
		//initially display topics in compact form
		$(TOPICS + ' ul').slideUp();
	});//getJSON
}

// ------------------------------------------------------------------------------------------	
// build question array from object built from JSON data Google supplied (which is a rather complex object.)
Quiz.prototype.loadQuestions = function(data)  {
	var me=this;
	
	//load question data
	// NOTE: no formatting of the data is done here.  
	//       All formatting is done when it's displayed or written to output file.
	var lineNum=2;		//first line we read is 2nd line in spreadsheet (1st line is headings)
	var currentTopic="Potpouri";
	var currentSubTopic="Potpouri";
	$(data.feed.entry).each(function() {
		//topic line?
		if (typeof this.gsx$topic !== 'undefined' && trim(this.gsx$topic.$t).length>1)
			currentTopic=this.gsx$topic.$t;
		
		//subtopic line?
		else if (typeof this.gsx$subtopic !== 'undefined' && trim(this.gsx$subtopic.$t).length>1) 
			currentSubTopic=this.gsx$subtopic.$t;

		//question line?
		else if (typeof this.gsx$question !== 'undefined' && trim(this.gsx$question.$t).length > 3) {
			var q = new Object;
			q.topic=currentTopic;
			q.subTopic=currentSubTopic;
			q.question=this.gsx$question.$t;
			if (typeof this.gsx$disptype !== 'undefined' && trim(this.gsx$disptype.$t).length > 0)
				q.dispType=this.gsx$disptype.$t;
			else 
				q.dispType="S"; //the default
			if (q.dispType != "S" && q.dispType != "R") {
				console.log("Line: " + lineNum + " -Invalid dispType, was changed to 'S'");
				q.dispType="S"; //the default
			}

			//load answer data
			q.answers = new Array;
			
			//Add answers (note: if the gsx$ fields are undefined, they're simply not added)  
			//The first four can be answera,b,c,d (new way) or answer1,2,3,4 (old way)
			if (me.addAnswer(q, this.gsx$answera) == false)
				me.addAnswer(q, this.gsx$answer1);
			if (me.addAnswer(q, this.gsx$answerb) == false)
				me.addAnswer(q, this.gsx$answer2);
			if (me.addAnswer(q, this.gsx$answerc) == false)
				me.addAnswer(q, this.gsx$answer3);
			if (me.addAnswer(q, this.gsx$answerd) == false)
				me.addAnswer(q, this.gsx$answer4);
			me.addAnswer(q, this.gsx$answere);
			me.addAnswer(q, this.gsx$answerf);
			me.addAnswer(q, this.gsx$answerg);
			me.addAnswer(q, this.gsx$answerh);
			
			//mark the correct answers as correct
			for(var x=0; x<this.gsx$correct.$t.length; x++) {

				var sAnsNdx=this.gsx$correct.$t[x]; //1-4 (old way) or a-h (new way)
				var ndx=99;
				if (sAnsNdx >= 'a' && sAnsNdx <= 'h')
					ndx = sAnsNdx.charCodeAt(0) - "a".charCodeAt(0); 
				if (sAnsNdx >= 'A' && sAnsNdx <= 'H')
					ndx = sAnsNdx.charCodeAt(0) - "A".charCodeAt(0); 
				if (sAnsNdx >= '1' && sAnsNdx <= '4')
					ndx = sAnsNdx.charCodeAt(0) - "1".charCodeAt(0);					
				if (ndx<q.answers.length) {
					q.answers[ndx].correct=true;
					q.answers[ndx].explanation="This is a correct answer";
				}
			}
			//load the help and explanation text
			if (typeof this.gsx$help !== 'undefined' && this.gsx$help.$t !== null) 
				q.help=this.gsx$help.$t;
			else	
				q.help="";
			if (typeof this.gsx$explanation !== 'undefined' && this.gsx$explanation.$t !== null) 
				q.explanation=this.gsx$explanation.$t;	
			else
				q.explanation="";
			
			q.correct=false;
			
			q.lineNum=lineNum;

			//add it to the array
			me.aAllQuestions.push(q); 
		} // if question
		
		//otherwise, the line must contain answer explanations for previous question. 
		else {
			//update explanations (if the gsx$ fields are undefined, they're simply not added)
			//The first four can be fields answera,b,c,d (new way) or answer1,2,3,4 (old way)
			if (me.updateAnswerExplanation(this.gsx$answera, 0) == false)
				me.updateAnswerExplanation(this.gsx$answer1, 0);
			if (me.updateAnswerExplanation(this.gsx$answerb, 1) == false)
				me.updateAnswerExplanation(this.gsx$answer2, 1);
			if (me.updateAnswerExplanation(this.gsx$answerc, 2) == false)
				me.updateAnswerExplanation(this.gsx$answer3, 2);
			if (me.updateAnswerExplanation(this.gsx$answerd, 3) == false)
				me.updateAnswerExplanation(this.gsx$answer4, 3);
			me.updateAnswerExplanation(this.gsx$answere, 4)
			me.updateAnswerExplanation(this.gsx$answerf, 5)
			me.updateAnswerExplanation(this.gsx$answerg, 6)
			me.updateAnswerExplanation(this.gsx$answerh, 7)
		} //else
		lineNum++;
	});//each
}

Quiz.prototype.addAnswer = function(q, answer) {
	if (typeof answer !== 'undefined' && trim(answer.$t).length>0) { 
		q.answers.push({text: answer.$t, correct: false, explanation: "This is an incorrect answer"});
		return true;
	}
	else
		return false;
}

Quiz.prototype.updateAnswerExplanation = function(explanation, ansNdx) {
	if (typeof explanation !== 'undefined' && trim(explanation.$t).length>0) {
		this.aAllQuestions[this.aAllQuestions.length-1].answers[ansNdx].explanation=explanation.$t;
		return true;
	}
	else	
		return false;
}

//------------------------------------------------------------------------------------------------------------
Quiz.prototype.buildTopicList = function() {		
	//go through questions array for topics and build list of topic links
	//NOTE: topics should be in order and not duplicated!!! Otherwise results are unknown.  Not tested...
	// <div id="topics">
	//   <h2>Topics</h2>
	//   <div class="topic"> //repeated for each different topic
	//      <h3>[topic_title]</h3>
	//      <ul>
	//         <li>subtopic_title - quiz link</li>   //repeated for each new link
	//      </ul>
	//		<button>random</button>
	//   </div>   //topic
	// </div>
	
	//Build topics/subtopic list
	var currTopic="none";
	var currSubTopic="none";
	var newTopic=true;
	for(var x=0; x<this.aAllQuestions.length; x++) {
		//new topic!
		if (this.aAllQuestions[x].topic != currTopic) {
			currTopic = this.aAllQuestions[x].topic;
			$(TOPICS).append('<div class="topic"><h3>' + currTopic +'</h3> <ul></ul> </div>');
			newTopic=true;
		}
		//new subtopic!
		if (newTopic==true || this.aAllQuestions[x].subTopic != currSubTopic) {
			//add new subtopic link
			currSubTopic = this.aAllQuestions[x].subTopic;
			$('<li>' + currSubTopic + '</li>')
				.addClass("contentLink")
				.attr("data-topic", currTopic)
				.attr("data-subTopic", currSubTopic)
				.appendTo($(TOPICS + ' ul:last'));
				
			//add question count to this new subtopic link
			var count=this.countQuestions(currTopic,currSubTopic,"S");
			$(TOPICS + ' li:last').append('<span class="topicQstCount"> (' + count + ')</span>');
		
			newTopic=false;
		}
	}; //for
	
	//add random question button to the end of each topic  
	var me=this;
	$(TOPICS + ' h3').each( function() {
		var topic = $(this).html(); 
		var buttonElem = $('<button>surprise me!</button>')
			.addClass("contentLink")
			.addClass("randomInTopic")
			.attr("data-topic", topic)
			.attr("data-subTopic", "all (random)");
		var count=me.countQuestions(topic, "","R");
		$(this).next().append(buttonElem).append('<span class="topicQstCount"> (+' + count + ')</span>');
	});
	
	//add random question button after topic list
	var topic = "All" 
	var buttonElem = $('<button>surprise me!</button>')
		.addClass("contentLink")
		.addClass("randomAll")
		.attr("data-topic", "All Topics")
		.attr("data-subTopic", "random");
	$(TOPICS).append(buttonElem);
}
//--------------------------------------------------------------------------------------------------
// counts and returns the questions in sAllQuestions that have the given topic/subtopic/dispType.
// "" for any of the parameters are treated as wildcards
//--------------------------------------------------------------------------------------------------
Quiz.prototype.countQuestions = function(topic, subTopic, dispType) {
	var count=0;
	for(var x=0; x<this.aAllQuestions.length; x++) {
		if ((topic == "" || this.aAllQuestions[x].topic == topic) 
		&& (subTopic == "" || this.aAllQuestions[x].subTopic == subTopic)
		&& (dispType== "" || this.aAllQuestions[x].dispType == dispType))
			count++;
	}
	return count;
}
//--------------------------------------------------------------------------------------------------
// Displays the next question in the dataset by loading all the question data from the quiz object
// into html elements it builds and puts on the page. Some info for questions (correct/explanation)
//	is attached to the answer elements using data attributes. 
//
// returns
//    TRUE if a question was displayed
//    FALSE if there were not more questions in dataset
//--------------------------------------------------------------------------------------------------
Quiz.prototype.displayNextQuestion = function() {

	//erase current info
	$(QUESTION).html("");
	$(ANSWERS).html("");
	$(EXPLANATION).html("");
	
	//increment currQst ndx. If only showing incorrectly answered questions, skip over correct ones.
	this.iCurrQst++;
	if (this.showOnlyIncorrect == true) {
		while (this.iCurrQst < this.aQuizQuestions.length && this.aQuizQuestions[this.iCurrQst].correct == true)
			this.iCurrQst++;
	}
	
	//no more questions to display
	if (this.iCurrQst >= this.aQuizQuestions.length) {
		this.iCurrQst--;
		return false;
	}

	
	//display question
	var oQst = this.aQuizQuestions[this.iCurrQst];
	$(QUESTION).html( formatAsHTML(oQst.question) );
	$(QUESTION_NUMBER).html(
		(this.iCurrQst+1) + " of " 	+ this.aQuizQuestions.length );

	//determine order answers will be shown
	// normally, they're just shown in the order they're in the datafile
	// but if we're showing random questions, the answers are randomized as well
	var answerOrder = new Array; 
	for (var x=0; x<oQst.answers.length; x++) 
		answerOrder.push(x); //0,1,2,3,etc..
	if (this.mode == "rand") {
		answerOrder.sort(function(a, b){return 0.5 - Math.random()});
	}
	
	//display answers
	for(var x=0; x<oQst.answers.length; x++)
	{
		var ansNdx = answerOrder[x];
		if (oQst.answers[ansNdx].correct) 
			sCorrect="true";
		else 
			sCorrect="false";
		
		var sAnsHTML='<div class="ansRow">'
			+ '<div class="mark"><img src="sad.png" alt="X"></div>'
			+ '<div class="answer" '
			+	'data-correct="' + sCorrect + '" '
			+ 	'data-explanation="' + htmlizeQuotes(oQst.answers[ansNdx].explanation) + '" ' 
			+ '>'
			+ formatAsHTML(oQst.answers[ansNdx].text)
			+ '</div>';
			+ '</div>';
		$(ANSWERS).append(sAnsHTML);
	}

	//question help
	$(BUTTON_HELP).hide();
	if ("help" in oQst) {
		if (oQst.help.length > 1) {
			$(HELP).html(oQst.help.replace(/\n/g,"<br>") );
			$(BUTTON_HELP).show();
		}
	} 
	
	//question explanation
	if ("explanation" in oQst) {
		$(EXPLANATION).html( oQst.explanation.replace(/\n/g,"<br>") );
	} else
		$(EXPLANATION).html("");

	//line number (from spreadsheet, for easy reference when making corrections)
	$('#questionId').html( 'Q' + ('0000'+oQst.lineNum).substr(-4) );
	
	return true;
}



//------------------------------------------------------------------
// Update the answer display and question based on how user answered question
//------------------------------------------------------------------
Quiz.prototype.checkAnswers = function() {
	var iWrong=0;
	var iRight=0;
	
	// show each answer as correct/incorrect 
	// and put sad faces next to incorrectly selected ones
	// and total up number of right and wrong selections
	$('.answer').each( function() {
		var bCorrect = $(this).data("correct");			//it is a correct answer
		var bSelected = $(this).hasClass("selected");	//it was selected 
		if (bCorrect) {
			$(this).addClass("correct");
			if (bSelected==false) {
				$(this).prev(".mark").css("visibility", "visible"); //shows mark (sad face)
				$(this).prev(".mark").data("explanation", "I'm sad because this is a correct answer and you didn't select it."); //explanation for sad face.  Shown on mouseover.
				iWrong++;
			} else {
				$(this).prev(".mark").css("visibility", "hidden");
				iRight++;
			}
		}
		else { //incorrect
			$(this).addClass("incorrect");
			if (bSelected==true) {
				$(this).prev(".mark").css("visibility", "visible"); //shows mark (sad face)
				$(this).prev(".mark").data("explanation", "I'm sad because you selected this answer and it's not correct."); //explanation for sad face.  Shown on mouseover.
				iWrong++;
			} else {
				$(this).prev(".mark").css("visibility", "hidden");
			}
		}

	});
	
	//update question correct/incorrect status (if not 100% correct, it's considered incorrect)
	if (iWrong == 0)
			this.aQuizQuestions[this.iCurrQst].correct=true;
	else
			this.aQuizQuestions[this.iCurrQst].correct=false;
		
	//configure overall result message
	if (iWrong == 0)
		$(RESULT_MSG).html('Correct!  Great job! <img src="happy.png">');
	else if (iRight > 0 && iWrong > 0)
		$(RESULT_MSG).html('Partially Correct <img src="happy.png">, but partially incorrect. <img src="sad.png">');	
	else 
		$(RESULT_MSG).html('Incorrect <img src="sad.png">');	
}

//--------------------------------------------------------------------------------
// Download file as .gift (for import into Moodle)
//  To keep things in the same order in Moodle
//  	Questions are numbered Q0001, Q0002, etc..
//  	subCategories are lettered a_given_name, b_given_name, etc..
//
//  aTopics - an array of topic names to download.  If empty, all are downloaded
//-------------------------------------------------------------------------------
Quiz.prototype.downloadAsGift = function(aTopics) {
	
	/*format data as .gift file, like this example:
	
	$CATEGORY: Ch04_selectors/a_medium 
	 
	Which of the following selectors matches any li element that is a child of the element who's id is \"list1\"
	{
		~%-50%list1 li # reason this is wrong
		~%-50%\#list1 li # reason this is wrong
		~%-50%list1 &gt; li # reason ithis is wrong
		~%100%\#list1 &gt; li # reason this is correct
	};
	*/
	
	var data = ""; //this will hold our entire output file contents

	data += "// " + this.title + "\n";
	if (aTopics.length==0)
		data += "// All sections.\n"
	else
		data += "// Sections: " + (" " + aTopics).replace(/\,/g, ", ") + "\n";
	
	var prevTopic="aslkjfl;askjfasflalk;laj";
	var prevSubTopic="alkjfajlf;jla;jflajl;dfsj";
	var subTopicLetter=97; //lowercase a, used as preface to subTopics to keep them in order
	
	for(var x=0; x<this.aAllQuestions.length; x++) {
		q=this.aAllQuestions[x];
		
		//skip questions that aren't in the list of topics we're picking (kinda kludgy)
		if ( aTopics.length>0 && aTopics.indexOf(q.topic)<0 )
			continue;
		
		
		//new category?
		if (q.topic != prevTopic || q.subTopic != prevSubTopic) {
			if (q.topic != prevTopic) {
				subTopicLetter=97; //a
				data += ("\n// ========================================================================================");
			}
		
			var fTopic = q.topic.replace(/[\&\\\/]/g, "and");     //replace &, \, or / with "and"
			var fSubTopic = q.subTopic.replace(/[\&\\\/]/g, "and"); //replace &, \, or / with "and"
			var category=(fTopic + "/" + String.fromCharCode(subTopicLetter) + "_" + fSubTopic).replace(/ /g, "_");
			data += "\n// ========================================================================================";
			data += "\n$CATEGORY: " + category + "\n\n";
			
			prevTopic = q.topic;
			prevSubTopic = q.subTopic;
			subTopicLetter++; 
		}
		
		//title
		data = data + "::Q" + ('0000' + q.lineNum).substr(-4) + "\n";
		
		//question
		data = data + '::' + encodeForGift(q.question) + "\n";
		
		//answers
		var numCorrect=0;
		for (var y=0; y<q.answers.length; y++) {
			if (q.answers[y].correct==true) numCorrect++;
		}
		var correctPct = [0,100,50,33.333,25];
		
		data = data + "{\n";
		for (var y=0; y<q.answers.length; y++) {
			if (q.answers[y].correct)
				value=correctPct[numCorrect];
			else
				value=-50;
			data += ("\t" + "~%" + value + "%" 
					 + encodeForGift(q.answers[y].text) 
					 + " # " + encodeForGift(q.answers[y].explanation)
					 + "\n");
		}
		data = data + "}\n\n";
	}

	
	//create a hidden download link and click on it.
	//(surely there's a better way, but I don't know what it is right now)
	var filename="QuizData_gift.txt";
	$('body').append('<a id="dl" download="' + filename + '" style="display:none"></a>');
    $('#dl').attr("href", "data:text/plain," + encodeURIComponent(data));
	document.getElementById('dl').click();
	$('dl').remove();
}

//================================================================================
function formatAsHTML(str) {
	//if line contains special image tag, get image name
	var regex=RegExp('<image (.*)>', 'g'); //also in array below
	var imgPath="Images227/";
	var imgName="";
	if ( (results = regex.exec(str)) !== null)
		var imgName=results[1];
	
	// special tag and character replacements
	// characters to replace, followed by replacement values.
	// Order matters for the speical code and image tags, as they
	// need to have <> replaced before the <> are changed to &lt and &gt;
	var swapFromTo = [
	"<code>", 		"ZZZcodeZZZ",
	"</code>", 		"ZZZ/codeZZZ",
	"<image .*>",   "ZZZimageZZZ",
	"<", 			"&lt;",
	">", 			"&gt;",
	"  ", 			"&nbsp;&nbsp;",
	"\n", 			"<br>",
	"ZZZcodeZZZ", 	"<span class='code'>", 
	"ZZZ/codeZZZ", 	"</span>"
	//ZZZimageZZZ is a special case dealt with after the loop	
	];
	
	//perform the replacments listed in the array above
	var newStr=str;
	for(var x=0; x<swapFromTo.length; x+=2) {
		var find = swapFromTo[x];
		var regex = new RegExp(find, "g");
		newStr=newStr.replace(regex, swapFromTo[x+1]);
	}
	
	//if there was an image tag, convert to html with image name
	if (imgName!="") 
		newStr=newStr.replace("ZZZimageZZZ",
		'<div class="imgContainer"><img src="' + imgPath + imgName + '"></div>');
	
	return newStr;
}

function htmlizeQuotes(str) {
	var newstr = str.replace(/\'/g, "&#39;");
	return newstr.replace(/\"/g,"&quot;");
}

//================================================================================
// encode the given string to be written to a .gift file so it will be interpreted
// and displayed by Moodle properly
function encodeForGift(str) {
	// characters to replace, followed by replacement values.
	// Order matters for many of these!

	var swapFromTo = [
		/* formatting our code delimiters is a two step process.  First we do this, */
		/* then after other < > are dealt with, we change this to html (at the end) */
		"<code>", "ZZZcodeZZZ",	
		"</code>", "ZZZ/codeZZZ",
		/* special gift chars, escaped as per gift doc so they're treated literally */
		"\\\\", "\\\\", /* this replaces \ with \\ (the extra \ on the input is because it's processed as a regex below)*/
		"#", "\\#",			
		"{", "\\{",		
		"}", "\\}",			
		"~", "\\~",		
		"=", "\\=",	
		/*we don't want these treated as parts of an html tag*/
		"<", "&lt;",
		">", "&gt;",
		"\n", "<br>",
		/*stuff that needs to be converted to html*/
		"  ", "&nbsp;&nbsp;",
		"ZZZcodeZZZ", "<span style\\=\"font-family: courier;\">",
		"ZZZ/codeZZZ", "</span>"
	];
	
	var newStr=str;
	for(var x=0; x<swapFromTo.length; x+=2) {
		var find = swapFromTo[x];
		var regex = new RegExp(find, "g");
		newStr=newStr.replace(regex, swapFromTo[x+1]);
	}
	
	return newStr;
}

//====================================================================================
// String trim functions: trim, rtrim, ltrim
function trim(str, chr) {
  var rgxtrim = (!chr) ? new RegExp('^\\s+|\\s+$', 'g') : new RegExp('^'+chr+'+|'+chr+'+$', 'g');
  return str.replace(rgxtrim, '');
}
function rtrim(str, chr) {
  var rgxtrim = (!chr) ? new RegExp('\\s+$') : new RegExp(chr+'+$');
  return str.replace(rgxtrim, '');
}
function ltrim(str, chr) {
  var rgxtrim = (!chr) ? new RegExp('^\\s+') : new RegExp('^'+chr+'+');
  return str.replace(rgxtrim, '');
}
