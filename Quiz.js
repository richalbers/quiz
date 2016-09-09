
//================================================================================
// File: 		Quiz.js
// Description: Displays review quizzes
// Version: 	0.7
// Author: 		Rich Albers
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
	aQuestions: [
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
		},
		...
	]
	//index values of quiz questions on currently in-progess quiz
	iFirstNdx:  X; 	//index of first question in selected topic/subtopic set
	iLastNdx: X;	//index of last question in selected topic/subtopic set
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
	
	// load all questions from google spreadsheet (and build topic last)
	var spreadsheetID = GetUrlParam('id');
	if (spreadsheetID == null)
		spreadsheetID = "1uEKeONFN2a3X304kH0J3YKYNMU6c_OuiN6fFEr55w0M";
	
	oQuiz = new Quiz; 
	oQuiz.getAndProcessQuestionData(spreadsheetID);	//Note: returns before completion (asyncronous!)
	
	//configure all event handlers ---------------------------------------
	
	$('body').keypress( function(event) {
		if (String.fromCharCode(event.which) == 'd')
			if (confirm('Download quiz data as .gift file?'))
				oQuiz.downloadAsGift();
	});
	
	//topic selected from list
	$(TOPICS).on("click", "h3", function() {
		$(this).next().slideToggle();
	});
	
	//quiz selected from list
	$(TOPICS).on("click", ".contentLink", function() {
		//unselect all other topics and select the one this link is in
		$(TOPICS + " .selected").each(function () {$(this).removeClass("selected");});
		$(this).parent().parent().addClass("selected"); //grandparent is topic container
		$(this).addClass("selected"); //TEST TEST TEST
		
		//quiz title will be "Category: subCategory"
		var catTitle=$(this).parent().parent().children(":first").html(); //grandparent is topic container
		var subCatTitle=$(this).html();
		$(QUIZ_TITLE).html(catTitle + ": " + subCatTitle); 
		
		//display quiz
		hideButtonsAndMessages();
		//$(ANSWERS).html();
		$(BUTTON_CHECK).show();
		$(QUIZ).show();
		$(GOTO_NEXT).show();
		$(GOTO_PREV).show();
		
		var classSubClass=$(this).attr("data-quiz");
		oQuiz.setLimits(classSubClass);
		oQuiz.iCurrQst=oQuiz.iFirstNdx-1;
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
		if (oQuiz.iCurrQst>oQuiz.iFirstNdx) {
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
			var totQuestions=oQuiz.iLastNdx - oQuiz.iFirstNdx + 1;
			for (var x=oQuiz.iFirstNdx; x<=oQuiz.iLastNdx; x++) {
				if (oQuiz.aQuestions[x].correct == true)
					totCorrect++;
			}
			$(QUESTION).html("You've come to the end of the questions for this topic.<br><br>" 
			  + "You answered " + totCorrect + " out of " + totQuestions + " questions correctly.<br>");
			if (totCorrect != totQuestions)
				$(QUESTION).append("<button id='retry'>Retry the missed questions</button> or");
			$(QUESTION).append("<br>&larr;pick another topic from the list on the left.");	

			$("#retry").click( function() {
				oQuiz.iCurrQst=oQuiz.iFirstNdx-1;
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

//================================================================================
// Quiz class
// depends on a bunch of constants 

function Quiz() {
	this.aQuestions = new Array; 	//array of questions (each question consists of text and an array of answers)
	this.iCurrQst = -1;				//index of question currently displayed
	this.iFirstNdx = -1;
	this.iLastNdx = -1;
}

//--------------------------------------------------------------------------------------------- 
// set lower and upper indexes for questions to be included on this quiz
// When complete
//		iFirstNdx will be set to first questions in given topic/subtopic
//		iLastNdx will be set to last question in given topic/subtopic
//--------------------------------------------------------------------------------------------- 
Quiz.prototype.setLimits = function(topicSubTopic) {
	var x=0;
	
	//first first question in given topicSubTopic
	while(x < this.aQuestions.length && topicSubTopic != (this.aQuestions[x].topic + this.aQuestions[x].subTopic) )
		x++;
	this.iFirstNdx = x;

	//find last question in given topicSubtopic, and mark all questions as incorrect (not yet answered correctly)
	while(x < this.aQuestions.length && topicSubTopic == (this.aQuestions[x].topic + this.aQuestions[x].subTopic) ) {
		this.aQuestions[x].correct=false;
		x++;
	}
	this.iLastNdx = x-1;
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
	
	me.firstNdx=-1;
	me.lastNdx=-1;
	me.currNdx=-1;
	me.showOnlyIncorrect=false;
	
	// get data from google spreadsheet
	// Spreadsheet must be published to the web. (only the worksheet with the questions)
	//https://docs.google.com/spreadsheets/d/1uEKeONFN2a3X304kH0J3YKYNMU6c_OuiN6fFEr55w0M/edit?usp=sharing
	//https://docs.google.com/spreadsheets/d/1uEKeONFN2a3X304kH0J3YKYNMU6c_OuiN6fFEr55w0M/pubhtml

	var url = "https://spreadsheets.google.com/feeds/list/" + spreadsheetID + "/od6/public/values?alt=json";
	
	$.getJSON(url, function(data) {	
		//use sheet title (FWIW, there appears to be no access to filename)
		$('h1').html(data.feed.title.$t);
		
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
	var lineNum=2;		//first line we read is 2nd line in spreadsheet (1st line is headings)
	var currentTopic="Potpouri";
	var currentSubTopic="Potpouri";
	$(data.feed.entry).each(function() {
		//if topic/subtopic is specified, save it.  It's added to every question object
		if (typeof this.gsx$topic !== 'undefined' && trim(this.gsx$topic.$t).length>1)
			currentTopic=this.gsx$topic.$t;
		if (typeof this.gsx$subtopic !== 'undefined' && trim(this.gsx$subtopic.$t).length>1) 
			currentSubTopic=this.gsx$subtopic.$t;

		//if question is specified, build question object
		if (typeof this.gsx$question !== 'undefined' && trim(this.gsx$question.$t).length > 3) {
			var q = new Object;
			q.topic=currentTopic;
			q.subTopic=currentSubTopic;
			q.question=this.gsx$question.$t;

			//load answer data
			var msgIncorrect="This is an incorrect answer";
			q.answers = new Array;
			if (typeof this.gsx$answer1 !== 'undefined' && trim(this.gsx$answer1.$t).length>0) 
				q.answers.push({text: this.gsx$answer1.$t, correct: false, explanation: msgIncorrect});
			if (typeof this.gsx$answer2 !== 'undefined' && trim(this.gsx$answer2.$t).length>0) 
				q.answers.push({text: this.gsx$answer2.$t, correct: false, explanation: msgIncorrect});
			if (typeof this.gsx$answer3 !== 'undefined' && trim(this.gsx$answer3.$t).length>0) 
				q.answers.push({text: this.gsx$answer3.$t, correct: false, explanation: msgIncorrect});
			if (typeof this.gsx$answer4 !== 'undefined' && trim(this.gsx$answer4.$t).length>0) 
				q.answers.push({text: this.gsx$answer4.$t, correct: false, explanation: msgIncorrect});					
			//mark the correct answers as correct
			for(var x=0; x<this.gsx$correct.$t.length; x++) {
				var ansNdx=this.gsx$correct.$t[x]-1;
				if (ansNdx<q.answers.length) {
					q.answers[ansNdx].correct=true;
					q.answers[ansNdx].explanation="This is a correct answer";
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
			me.aQuestions.push(q);  //FIX?????????????
		} // if question
		//otherwise, see if this line contains answer explanations (for previous question)
		else {
			if (typeof this.gsx$answer1 !== 'undefined' && trim(this.gsx$answer1.$t).length>0) 
				me.aQuestions[me.aQuestions.length-1].answers[0].explanation=this.gsx$answer1.$t;
			if (typeof this.gsx$answer2 !== 'undefined' && trim(this.gsx$answer2.$t).length>0) 
				me.aQuestions[me.aQuestions.length-1].answers[1].explanation=this.gsx$answer2.$t;			
			if (typeof this.gsx$answer3 !== 'undefined' && trim(this.gsx$answer3.$t).length>0) 
				me.aQuestions[me.aQuestions.length-1].answers[2].explanation=this.gsx$answer3.$t;			
			if (typeof this.gsx$answer4 !== 'undefined' && trim(this.gsx$answer4.$t).length>0) 
				me.aQuestions[me.aQuestions.length-1].answers[3].explanation=this.gsx$answer4.$t;
			} //else
		lineNum++;
	});//each
}
//------------------------------------------------------------------------------------------------------------
Quiz.prototype.buildTopicList = function() {		
		//go through questions array for topics and build list of topic links
		//NOTE: topics should be in order and not duplicated!!! Otherwise results are unknown.  Not tested...
		// <div id="topics">
		//   <h2>Topics</h2>
		//   <div id="topic"> //repeated for each different topic
		//      <h3>[topic title]</h3>
		//      <ul>
		//         <li>quiz link</li>   //repeated for each new link
		//      </ul>
		//   </div>   //topic
		// </div>
		
		//TODO FIX the logic in the for loop.  It's messy.
		var currTopic="none";
		var currSubTopic="none";
		var subtopicStartNdx=-1;
		var newTopic=true;
		for(var x=0; x<this.aQuestions.length; x++) {
			if (this.aQuestions[x].topic != currTopic) {
				currTopic = this.aQuestions[x].topic;
				$(TOPICS).append('<div class="topic"><h3>' + currTopic +'</h3> <ul></ul> </div>');
				newTopic=true;
			}
			if (newTopic==true || this.aQuestions[x].subTopic != currSubTopic) {
				//add question count to previous subtopic link
				if (subtopicStartNdx != -1) { //don't do this if this is the first subtopic.
					$(TOPICS + ' li:last').append('<span class="topicQstCount"> (' + (x-subtopicStartNdx) + ')</span>');
				}
				subtopicStartNdx=x;
				//add new subtopic link
				currSubTopic = this.aQuestions[x].subTopic;
				var sHTML='<li class="contentLink" data-quiz="' + currTopic+currSubTopic +'">' +currSubTopic+'</li>';
				$(TOPICS + ' ul:last').append(sHTML);
			}
			newTopic=false;
		}; //for
		//add queston count to last subtopic link
		$(TOPICS + ' li:last').append('<span class="topicQstCount"> (' + (x-subtopicStartNdx) + ')</span>');

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
		
	//invalid question#?
	if (this.iCurrQst+1 > this.iLastNdx)
		return false;

	//increment currQst ndx. If only showing incorrectly answered questions, skip over correct ones.
	this.iCurrQst++;
	if (this.showOnlyIncorrect == true) {
		while (this.iCurrQst <= this.iLastNdx && this.aQuestions[this.iCurrQst].correct == true)
			this.iCurrQst++;
		if (this.iCurrQst > this.iLastNdx) {
			this.iCurrQst--;
			return false;
		}
	}
	
	//display question
	var oQst = this.aQuestions[this.iCurrQst];
	$(QUESTION).html( formatAsHTML(oQst.question) );
	$(QUESTION_NUMBER).html(
		(this.iCurrQst-this.iFirstNdx +1) + " of " 
		+ (this.iLastNdx - this.iFirstNdx + 1) );

	//display answers

	for(var x=0; x<oQst.answers.length; x++)
	{
		if (oQst.answers[x].correct) 
			sCorrect="true";
		else 
			sCorrect="false";
		
		var sAnsHTML='<div class="ansRow">'
			+ '<div class="mark"><img src="sad.png" alt="X"></div>'
			+ '<div class="answer" '
			+	'data-correct="' + sCorrect + '" '
			+ 	'data-explanation="' + oQst.answers[x].explanation + '" '
			+ '>'
			+ formatAsHTML(oQst.answers[x].text)
			+ '</div>';
			+ '</div>';
		$(ANSWERS).append(sAnsHTML);
	};

	//question help
	$(BUTTON_HELP).hide();
	if ("help" in oQst) {
		if (oQst.help.length > 1) {
			$(HELP).html(oQst.help);
			$(BUTTON_HELP).show();
		}
	} 
	
	//question explanation
	if ("explanation" in oQst)
		$(EXPLANATION).html(oQst.explanation);
	else
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
			this.aQuestions[this.iCurrQst].correct=true;
	else
			this.aQuestions[this.iCurrQst].correct=false;
		
	//configure overall result message
	if (iWrong == 0)
		$(RESULT_MSG).html('Correct!  Great job! <img src="happy.png">');
	else if (iRight > 0 && iWrong > 0)
		$(RESULT_MSG).html('Partially Correct <img src="happy.png">, but partially incorrect. <img src="sad.png">');	
	else 
		$(RESULT_MSG).html('Incorrect <img src="sad.png">');	
}

//------------------------------------------------------------------
// Download file as .gift (for import into Moodle)
//  To keep things in the same order in Moodle
//  	Questions are numbered Q0001, Q0002, etc..
//  	subCategories are lettered a_given_name, b_given_name, etc..
//------------------------------------------------------------------
Quiz.prototype.downloadAsGift = function() {
	
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
	
	var prevTopic="aslkjfl;askjfasflalk;laj";
	var prevSubTopic="alkjfajlf;jla;jflajl;dfsj";
	var subTopicLetter=97; //lowercase a, used as preface to subTopics to keep them in order
	
	for(var x=0; x<this.aQuestions.length; x++) {
		q=this.aQuestions[x];
		
		//new category?

		if (q.topic != prevTopic || q.subTopic != prevSubTopic) {
			if (q.topic != prevTopic)
				subTopicLetter=97; //a
			var category=(q.topic + "/" + String.fromCharCode(subTopicLetter) + "_" + q.subTopic).replace(/ /g, "_");
			data += ("\n$CATEGORY: " + category + "\n\n");
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
	// characters to replace, followed by replacement values.
	// Order matters for many of these!

	var swapFromTo = [
	"<code>", 	"ZZZcodeZZZ",
	"</code>", 	"ZZZ/codeZZZ",
	"<", 		"&lt;",
	">", 		"&gt;",
	"  ", 		"&nbsp;&nbsp;",
	"\n", 		"<br>",
	"ZZZcodeZZZ", "<span class='code'>", 
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