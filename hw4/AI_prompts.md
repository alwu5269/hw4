# AI Prompts Log

## Problem 2: Analyze the database

**Prompt 1:**
> Create output/harness.md. Include each table and each of its fields with a description of the importance of the field.
> Table Catalogue:
> * product_id: distinguishing id/number to help identify the product
> * name: name of the product
> * garment_type: the type of clothing the product belongs to (e.g. short-sleeve T-shirt)
> * description: a sentence/snippet describing the product
> * colors: colors used on the product
> * search_tags: associated tags/words/phrases to categorize or identify the product
> * image_file_path : the file path to the product image
> * price: price of the product
>
> Table inventory:
> * id: numerical id for the product in this table
> * product_id: corresponding id for the product that should allow for easy cross-reference between the inventory and catalogue tables
> * size: size of the clothing item
> * quantity: number of items in this size
>
> Table users:
> * id: numerical id for the user in the table
> * name: name of the user
> * email: user's email
> * password_hash: hashed version of the user's password
> * created_at: when the user's account was made
> * first_name: the user's first name
> * last_name: the user's last name
>
> Table chat_messages:
> * id: numerical id for the chat message in this table
> * user_id: corresponding id of the user who sent this chat message in the user's table
> * role: is this a message from the user or the chatbot?
> * content: text content of the message sent
> * products_json: list of products that the chatbot finds
> * created_at: when the message was sent

**Follow-up prompt (if needed):**
> yes, change the inventory id description

*Why the first prompt wasn't enough:*
My description of `inventory.id` called it an id for the product, but each inventory row is a single product in a single size, so I changed it to describe a product–size stock entry.

## Problem 3: Build the Campus Customs website

**Prompt 1:**
> add a frontend folder. The frontend will be built using React + Vite + TypeScript. The main pages for the website will be:
> * Home
> * Products
> * About Us
> * Log in
> * Create account
>
> Refer to https://yalebulldogblue.com/ for  word styling. Fill out About Us with the following information:
>
> We are a family owned business selling apparel, merch, and souvenirs. We have worked with Yale for many years. We have stayed in Connecticut for the X number of years that we have been here.
>
> The Products page should show product images from the catalogue along with basic product information. Each product should open a single-item page with a large image of the product on one side with product information on the other (description, price, stock + sizes).
>
> There should be a floating chat interface in the bottom right. It will be hooked up later.
>
> Also need to create a simple FastAPI in backend/main.py to provide products and images via database.

**Follow-up prompt (if needed):**
> can we add rounded borders to the products on the product page? and overall make it cuter? like using handsome dan
>
> rather than all products on one page, could we limit to 20 products per page
> 
> Could we also draw a party banner below the main header with yale blue triangles with a white Y
> 
> rather than straight across, can we have it do an upside down arc as if on a string and attached at certain spots. I would prefer no swaying
> 
> Could we remove the colored background behind the garland? Also I want a slight animation when the mouse hovers over one of the flags
> 
> Lets keep on the top rather than sticky like the header

*Why the first prompt wasn't enough:*

Further added styling.


## Problem 4: Create account and login

**Prompt 1:**
> Onto Problem 4. I want to build out the account feature.
>
> * Create account: takes in a first name, last name, email, password, and confirm password (add checks to ensure strong password like 6-16 characters and one special character)
> * log in: use email and password to log in
>
> New accounts should be saved into the users table. Make sure to use salt and hashing to ensure the saved password is secured and hackers cannot access them.
>
> Update harness.md to specify how the auth works (what is stored for a user and how the passwords are protected)

**Follow-up prompt (if needed):**
> I cannot login.

> I used test@campuscustoms.yale.edu. I know the password

*Why the first prompt wasn't enough:*
The first prompt didn't mention the accounts already in the `users` table. Their password hashes were stored as `pbkdf2_sha256$<salt>$<hash>` with no iteration count, so the new login code guessed the wrong setting and rejected the correct password for `test@campuscustoms.yale.edu`. A helper script (which asked for the password privately) found they were made with 120,000 PBKDF2-SHA256 iterations, and the login code was updated to use that for the older accounts.


## Problem 5: PydanticAI agent backend

**Prompt 1:**
> Onto Problem 5. We are building the shop chatbot as a PydanticAI agent behind FastAPI to be plugged into the front-end widget. We want to keep the API app in backend/main.py. We want  the following files for the agent:
>
> * backend/prompts/prompt.md (system prompt)
> * backend/agent.py (agent entry)
> * backend/tools.py (tools for the agent)
> * backend/models.py (pydanticAI types/models)
>
> In main.py, expose a chat route so a message sent on the website receives a reply from the agent.
>
> Add Campus Customs voice and safety basics into prompts/prompt.md. Add to models.py so that chat replies and product cards are in there.
>
> Add to output/harness.md on how the frontend talks to FastAPI and how the agent is loaded.
>
> We also want the backend to run from the backend folder using the following terminal command:
> uvicorn main:app --reload --port 8000

**Follow-up prompt (if needed):**
> 

*Why the first prompt wasn't enough:*


## Problem 6: Tools: product info and stock

**Prompt 1:**
> create tools for the agent to look up information from campus_customs.db:
>
> * product description
> * price
> * how many are in stock (by size)
>
> The agent must use the device and is not allowed to invent prices, quantities or products. If the size is out of stock, this must be stated clearly.
>
> Expand prompts/prompt.md so that the agent knows to use these tools for price and stock questions. Add return types in models.py.
>
> Add each tool and explain which model fields were chosen for look up results and why to output/harness.md.

**Follow-up prompt (if needed):**
> 

*Why the first prompt wasn't enough:*


## Problem 7: Chat search that updates the page

**Prompt 1:**
> Onto Problem 7. We want to this feature:
>
> * when a customer asks about an item (e.g. what hoodies do you have?), the agent should search the catalogue and the website should dynamically show those matching items as product cards(image, name, price, other info).
>
> Make sure the same single-item page behavior still works (also the product cards that are shown in the chat should redirect to these pages when clicked).
>
> Update prompts/prompt.md and output/harness.md so it is clear how search results reach the page.

**Follow-up prompt (if needed):**
> 

*Why the first prompt wasn't enough:*


## Problem 8: Customer memory

**Prompt 1:**
> Onto Problem 8. When a shopper is logged in, save their chat history in the chat_messages table and reload it when they return. The agent should know who is chatting and put that in the agent deps and tools.
>
> Also, pass enough page context that if someone is on a product page and asks do you have this in pink? the agent knows which item they are looking at.
>
> History only persists for logged-in users.
>
> Document the following in output/harness.md:
>
> * how user chat history is stored
> * what customer fields the agent sees
> * how page context is passed

**Follow-up prompt (if needed):**
> 

*Why the first prompt wasn't enough:*


## Problem 9: Usability improvements

**Prompt 1:**
> Onto Problem 9. I have a couple of front-end changes I would like to add:
>
> * Small stylistic changes:
>    * I would like to add a pile of dog bones in the bottom left corner for handsome dan. Please use svg to create.
>    * Fix the form for creating a new account. The Last Name text box overflows.
>    * Add an add to cart button. This just has a confetti animation when clicked.
> * Increase the size of the chat text box when it is filled so the user can see all of the text they put in. Add a max height though.
> * Add suggested starter questions for the chatbot
>
> Backend:
>
> * Double check the numbers in the chatbot's reply messages.
> * Update search so it isn't just reliant on substring check.
> * Ensure the user's cannot fake or change previous chat messages from users or the agent
>
> Create and add to output/usability.md with my improvements:
>
> * What I added
> * How this helps a shopper or the business

**Follow-up prompt (if needed):**
> 

*Why the first prompt wasn't enough:*


## Problem 10: Style the website

**Prompt 1:**
> Onto Problem 10. Update the styling:
>
> * The pile of bones should stay above the blue section on the bottom.
> * The Add to Cart button should be disabled unless a particular size is selected
> * Use tennis balls as the thinking indicator for the chatbot
> * Add a handsome dan sitting behind slightly to the right of the pile of bones.
> * when the user clicks the pile of bones in the bottom right, a bone wiggles. After 5 clicks, Handsome Dan grabs a bone and wags his tail.
> * Add a transition between the pages.
> * When the user goes to a product page, allow the user to dress Handsome Dan in any product with a "Put it on Dan" link below the product image.

**Follow-up prompt (if needed):**
> Page transitions. Each page fades in and rises slightly as you move between them. Can we have this be a bit slower, it is still rather abrupt. Can we have a visual transition?

> This feels too abrupt

> I think I preferred the fade in. Could we use blue somehow though

> go back to the first transition

> The page still jumps around. Specifically the bottom banner

> the loading tennis balls go too high. Could you keep them a bit lower?

> When Dan puts on the School of Management shirt, change his collar to a bowtie.

> on the about us page and on the top banner, add small dog bones between:
>
> * APPAREL, MERCH, SOUVENIRS
> * Family owned. Yale proud. Connecticut made.

> add bones to the footer too

> Can we actually flip the positions of the bones and handsome dan?

> When the screen is too small, can we just keep Handsome Dan with his bones on the bottom? Can we also move the Y bone to the left and make it wiggle last.

> rather than have handsome dan just on the bottom when the screen is small. Can we just change it so he peeks in on the left

*Why the first prompt wasn't enough:*
The original page transition felt abrupt, so I tried a slower version with a sliding blue curtain and then a blue fade, but went back to the original fade-in. The real cause of the jumpiness was the footer moving while a new page loaded and the page keeping its old scroll position, which was fixed separately. The tennis-ball loading indicator bounced too high and was lowered. I also added extra touches the first prompt didn't cover: a bowtie for Dan when he wears the School of Management shirt, and small dog-bone separators in the header tagline, the About Us banner, and the footer. After that, I swapped Dan and the bones so Dan sits on the left, moved the Y bone to the left and made it the last to wiggle (right before Dan grabs it), and handled small screens: putting Dan at the bottom of the page made him easy to miss, so instead he peeks in from the left edge.


## Problem 11: Site testing (app check)

**Prompt 1:**
> Onto Problem 11. We want to test the site and document it in output/app_check.html.
>
> The html file should include clear screenshots and captions for:
>
> * chat checking the inventory level of an item (honest stock/price from DC)
> * Dynamic search result cards after a category question (e.g. hoodies)
> * one of the features I added in problem  9
>
> For each check, we want a section that has:
>
> * a heading
> * screenshot picture
> * one or two sentences of what the image shows
>
> The screenshot image should go into "output/app_check_images/" and be used in app_check.html via relative path

**Follow-up prompt (if needed):**
> Retake photos and add this as a usability change for responsive design as well as follow up prompts in the correct spot in AI_prompts.md

*Why the first prompt wasn't enough:*
After the screenshots were taken I changed Handsome Dan's corner (Dan moved to the left of the bones, the Y bone moved, and small screens got a peeking Dan), so the app check images were out of date. I retook all four screenshots with the current site and added the small-screen change, with a phone screenshot, to `output/usability.md` as a responsive design improvement.


## Problem 12: Audit trail, safety, finish harness

**Prompt 1:**
> Onto Problem 12. Create an append-only output/audit_trail.json for agent-loop activity (time, tool name, short args/result, stop reason)
>
> This should not be overwritten or wiped between runs.
>
> Add safety rules to the agent and add them to prompts/prompt.md:
>
> * do not make up any values or information
> * no secret information is asked for or saved in messages
>
> Finish output/harness.md with info on how the system works:
>
> * model fields in models.py and why you chose them
> * tools + abilities
> * safety rules
> * specs (loop limits, result caps, models, how to run front and back end)

**Follow-up prompt (if needed):**
> Are there other safety features I am not thinking of?

> I meant safety features for my agent

> check problem 12

> yes, add the line

*Why the first prompt wasn't enough:*
The first prompt covered the required pieces, so the follow-ups were about going further and checking. I first asked about safety in general, then clarified I meant safety for the agent, which gave ideas like enforcing the out-of-stock rule in code (added later during the Problem 6 check). Checking Problem 12 against the assignment found that the harness's `ProductCard` row was missing the hidden `description` field added for the product cards, so I had that line added.

## Problem 13: Push to GitHub and submit the URL

**Prompt 1:**
> do problem 13

**Follow-up prompt (if needed):**
> (Answered setup questions: rename hw-04 to hw4; a new repo just for hw4; I'll create the empty public GitHub repo and paste the URL.)

> fill in AI_prompts.md for problems 12 and 13

*Why the first prompt wasn't enough:*
"do problem 13" relied on the assignment screenshot and didn't say how to set things up: the folder was named `hw-04` instead of `hw4`, nothing was in git yet, and the GitHub command-line tool wasn't installed. I chose to rename the folder, use a new repository that contains only `hw4/`, and create the empty public GitHub repository myself so the push only happens after I confirm. I also had the Problem 12 and 13 sections of this file filled in before submitting.
