---
layout: page
permalink: /teaching/
title: Teaching
description: I have worked as both a teaching assistant and course instructor and mentored, and I have had fun every bit of it!
nav: true
nav_order: 6
---

<div class="teaching">

<h2 class="teaching-group">Instructor</h2>
{% bibliography --file teaching --template teaching_bib --group_by none --query @course[role~=Instructor] %}

<h2 class="teaching-group">Teaching Assistant</h2>
{% bibliography --file teaching --template teaching_bib --group_by none --query @course[role~=Assistant] %}

<h2 class="teaching-group">Mentoring</h2>
{% bibliography --file teaching --template teaching_bib --group_by none --query @mentoring %}

</div>
