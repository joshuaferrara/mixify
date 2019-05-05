class Mixify {
    constructor(cocktailDb) {
        this.cocktailDb = cocktailDb;
        this.outputH = [];
        this.pgNum1 = 1;
        this.displayNum = 15;
        this.start = 0;
        this.end = this.start + this.displayNum;
        this.ingredientMultiplier = 1;
        Object.freeze(this.cocktailDb);
        /* 
            this.cocktailDb = {
                cocktails: [
                    0: {

                    }
                ],

                ingredients: [
                    "Whiskey",
                    "Vodka"
                ]
            }
        */
        
        this.checkAge().then((hideAlcoholic) => {
          console.log(this.cocktailDb.cocktails);

          this.defaultCocktails = Object.values(this.cocktailDb.cocktails);
          if (hideAlcoholic) {
            // Filter out all alcoholic cocktails
            this.defaultCocktails = this.defaultCocktails.filter((cocktail) => this.isNonAlcoholic(cocktail));
          }

          // TODO: Select random n-cocktails to display
          //       when no search terms are provided.
          Object.freeze(this.defaultCocktails);

          this.filteredCocktails = this.defaultCocktails;
          this.initializeSearchBar();
          this.generateCards();
          this.displayCards();
          this.changePagination();
          console.log(`Loaded Mixify with ${Object.keys(this.filteredCocktails).length} drinks.`);
        });
    }

    isNonAlcoholic(cocktail) {
      if (cocktail.alcoholic == null) return false;
      return cocktail.alcoholic.toLowerCase() == "non alcoholic" || cocktail.alcoholic.toLowerCase() == "optional alcohol";
    }

    // Sets up the search bar tagging stuff
    initializeSearchBar() {
        var ingredientNames = new Bloodhound({
            local: this.cocktailDb.ingredients,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            datumTokenizer: Bloodhound.tokenizers.whitespace
        });
        ingredientNames.initialize();

        this.searchIngredients = $('input').tagsinput({
            typeaheadjs: {
              source: ingredientNames
            }
        })[0];

        $('input').on('beforeItemAdd', (event) => {
            // Cancel the item add if the ingredient the user is trying to add
            // does not exists in our ingredient database.
            event.cancel = this.cocktailDb.ingredients.indexOf(event.item) == -1;
        });

        let tagInputChangeEventHandler = () => {
            this.filterCards();
            this.sortCards();
            this.nextPage(1);
            this.generateCards();
            this.displayCards();
        }

        $('input').on('itemAdded', tagInputChangeEventHandler);
        $('input').on('itemRemoved', tagInputChangeEventHandler);
    }

    get selectedIngredients() {
        return this.searchIngredients.itemsArray.map((ingr) => ingr.toLowerCase());
    }

    filterCards() {
        const selectedIngredients = this.selectedIngredients;
        if (selectedIngredients.length == 0) {
            this.filteredCocktails = this.defaultCocktails;
        } else {
            this.filteredCocktails = Object.values(this.cocktailDb.cocktails).filter((cocktail) => {
                if (this.isNonAlcoholic(cocktail) === false && this.hideAlcoholic) return false;
                return selectedIngredients.some((ingredient) => 
                                                 Object.keys(cocktail.ingredients).map((ingr) => ingr.toLowerCase()).includes(ingredient));
            });
        }
    }

    sortCards() {
        const numIngredientsRequired = (cocktail) => {
          let ingredientList = Object.keys(cocktail.ingredients).map((val) => val.toLowerCase());
          let count = ingredientList.length;
          this.selectedIngredients.map((val) => val.toLowerCase()).forEach((ingredient) => {
            if (ingredientList.indexOf(ingredient) != -1) count--;
          });
          return count;
        };

        this.filteredCocktails = this.filteredCocktails.sort((cocktailA, cocktailB) => {
          let countA = numIngredientsRequired(cocktailA); 
          let countB = numIngredientsRequired(cocktailB); 
          if (countA > countB) return 1;
          if (countA < countB) return -1;
          return 0;
        });
    }
    
    // Generates list of cards
    generateCards() {
        this.outputH = [];
        this.outputH[0] = `<div class="container"><div class="card-columns">`;
        if(this.end > this.filteredCocktails.length) {
          this.end = this.filteredCocktails.length;
        } else if(this.end <= 0) {
          this.end += this.displayNum;
        }
        if(this.start < 0) {
          this.start = 0;
        } else if (this.start >= this.filteredCocktails.length) {
          this.start -= this.displayNum;
        }
        for(let i = this.start; i < this.end; i++) {
          let cocktailData = this.filteredCocktails[i];
            let outputHtml = ``;
            let ingredientHtml = ``;
           
            const hasIngredient = (name) => {
              return this.selectedIngredients.indexOf(name.toLowerCase()) != -1;
            };

            let cocktailIngredients = Object.keys(cocktailData.ingredients).sort((a, b) => {
              if (hasIngredient(a) && !hasIngredient(b)) return -1;
              if (hasIngredient(b) && !hasIngredient(a)) return 1;
              return 0;
            });

            cocktailIngredients.forEach((key) => {
                let hasIngredientClass = (hasIngredient(key) ? "success" : "primary");
                ingredientHtml += `<span class="badge badge-${hasIngredientClass} m-1">${key}</span>`;
            });
            let alcoholClass = 0;
            if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Optional') != -1) {
                alcoholClass = "warning";
            } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Non') != -1) {
                alcoholClass = "danger";
            } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Alcoholic') != -1) {
                alcoholClass = "success";
            }

            // TODO: some cocktail objects don't have the `alcoholic`
            //       property. For these cases, we might wanna set
            //       the alcoholic property to a question mark or
            //       something.
            

            outputHtml += `<div class="card mb-4 flex-fill shadow" id="${i}">
            <img class="bd-placeholder-img card-img-top flex-fill" src="${cocktailData.thumbnail}" focusable="false" role="img" aria-label="Placeholder: Thumbnail"></img>
            <div class="card-body">
            <p>${cocktailData.name}</p>`;

                
                if(alcoholClass == 0) {
                  outputHtml += `<span class="badge badge-secondary float-right">Unknown</span>`;
                } else {
                  outputHtml += `<span class="badge badge-${alcoholClass} float-right">${cocktailData.alcoholic}</span>`;
                }
                outputHtml += `</p>
                <div>
                  ${ingredientHtml}
                </div>
            </div>
          </div>`;

          this.outputH.push(outputHtml);
        }
        
    }
    displayCards() {
        let displayHtml = this.outputH[0];

        for(let i = 2; i < this.outputH.length; i++)
            displayHtml += this.outputH[i];
        displayHtml +=this.outputH[1];
        $("#cocktailAlbum").html(displayHtml);
        let ChangeModalHndler = (b) => {
          this.displayModal(b);
        }
        $(".card").click(function(){
          let b = $(this).attr('id');
          ChangeModalHndler(b);
          $('#mod').modal('toggle');
        });
    }
    nextPage(pgNum){
      //calculates the max page number
      let maxPg = Math.round(this.filteredCocktails.length/this.displayNum);
      if(maxPg - this.filteredCocktails.length/this.displayNum < 0) {
        maxPg += 1;
      }
      //checks argument, if negative then its either pg next, back pg,
      //or last pg
      if (pgNum == -1) {
        this.pgNum1 += 1;
      } else if (pgNum == -2) {
        this.pgNum1 -= 1;
      } else if (pgNum == -3) {
        this.pgNum1 = maxPg;
      } else {
        this.pgNum1 = pgNum;
      }
      //checks to see if pg number will be out of bounds
      if(this.pgNum1 > maxPg) {
        this.pgNum1 = maxPg;
      } else if(this.pgNum1 < 1) {
        this.pgNum1 = 1;
      }
      //sets the values for displayCards to use
        this.end = this.displayNum*this.pgNum1;
        this.start = this.end - this.displayNum;
        
        this.generateCards();
        this.displayCards();
        this.changePagination();
    }
    //changes the page numbers and also makes sure that it displays the real page number
    changePagination(){
      let numTabs = this.filteredCocktails.length / this.displayNum;
      let displayHtml = `<li class="page-item"><a class="page-link" href="#">&lt</a></li>
                         <li class="page-item"><a class="page-link" href="#">Back</a></li>`;
      if(numTabs - Math.round(numTabs) > 0) {
        numTabs =  Math.round(numTabs) + 1;
      } else {
        numTabs = Math.round(numTabs);
      }
      let i = this.pgNum1;
      if(i < 3) {
        i = 1;
      } else {
        i -= 2;
      }
      let stop = i+4;
      if(stop > numTabs) {
        stop = numTabs;
        i = numTabs -4;
        if(i < 1) {
          i = 1;
        }
      }
      for(i; i <= stop; i++) {
        displayHtml += `<li class="page-item"><a class="page-link" href="#">${i}</a></li>`;
      }
      displayHtml += `<li class="page-item"><a class="page-link" href="#">Next</a></li>
                      <li class="page-item"><a class="page-link" href="#">&gt</a></li>`;
      $("#paginationHtml").html(displayHtml);
      //this handles the conditions of a pg number getting clicked
      let ChangePageHndler = (b) => {
        this.nextPage(b);
      }
      $(".page-item").click(function(){
        let b = $(this).text();
        if(b == "Next") {
          b = -1;
        } else if (b == "Back") {
          b = -2;
        } else if (b == "<") {
          b = 1;
        }
        else if(b == ">") {
          b = -3;
        }
        ChangePageHndler(b);
      });
    }
    displayModal(mid){ 
      let cocktailData = this.filteredCocktails[mid];
      let ingredientsModal = `<ul>`;
      Object.keys(cocktailData.ingredients).forEach((key) => {
        let hasIngredientClass = (this.selectedIngredients.indexOf(key.toLowerCase()) != -1 ? "success" : "primary");
        let newUnits = cocktailData.ingredients[key].split(" ");
        newUnits[0] *= this.ingredientMultiplier;
        let displayIngr = ``;
        newUnits.forEach((ing) => {
          displayIngr += ing;
          displayIngr += ` `;
        });
        ingredientsModal += `<li class="">${key}: ${displayIngr}</li>`;
        
        console.log(cocktailData.ingredients[key].split(" "));
      });
      ingredientsModal += `</ul>`;
      let alcoholClass = 0;
      if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Optional') != -1) {
        alcoholClass = "warning";
      } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Non') != -1) {
        alcoholClass = "danger";
      } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Alcoholic') != -1) {
        alcoholClass = "success";
      }
      let outputModal = `<div class="modal fade" id="mod" tabindex="-1" role="dialog" aria-labelledby="exampleModalLongTitle" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
              <div class="modal-content">
                <div class="modal-header">
                    <div class="container">
                      <div class="row">
                        <div class="col">
                            <h5 class="modal-title">${cocktailData.name}<span class="badge badge-`;
      if(alcoholClass == 0) {
          //OUTPUT MODAL
           outputModal += `secondary ml-3"">Unknown</span>`;
         } else {
           //OUTPUT MODAL
           outputModal += `${alcoholClass} ml-3">${cocktailData.alcoholic}</span>`;
         }
         let options = ``;
         for(let j = 0; j < 100; ++j) {
           options += `<a class="dropdown-item" href="#">${j+1}</a>`;
         }
         //OUTPUT MODAL
         outputModal += `</h5>
                    </div>
                    <div class="col-1 mr-3">
                        <div class="dropdown">
                        <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                          Units
                        </button>
                        <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                          <a class="dropdown-item" href="#">Action</a>
                          <a class="dropdown-item" href="#">Another action</a>
                          <a class="dropdown-item" href="#">Something else here</a>
                        </div>
                        </div>
                    </div>
                    <div class="col-1">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                          </button>
                    </div>
                  </div>
                </div>
                </div>
                <div class="modal-body">
                  <div class="container">
                    <div class="row">
                      <div class="col">
                          <img class="bd-placeholder-img card-img-top" src="${cocktailData.thumbnail}" focusable="false" role="img" aria-label="Placeholder: Thumbnail"></img>
                      </div>
                      <div class="col">
                      <div class="btn-group float-right">
                      <button type="button" class="btn btn-sm btn-secondary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                      Quantity: 1  
                      <span class="sr-only">Toggle Dropdown</span>
                      </button>
                      <div class="dropdown-menu scrollable-menu w-1">
                      ${options}
                      </div>
                    </div>
                        <h5>List of ingredients: </h5>
                        <div id="ingredients">
                        ${ingredientsModal}
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col pt-2">
                        <h5>Instructions:</h5>
                        ${cocktailData.instructions}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
          $("#displayModal1").html(outputModal);
          let ChangePageHndler = (b) => {
            Object.keys(cocktailData.ingredients).forEach((key) => {
              let hasIngredientClass = (this.selectedIngredients.indexOf(key.toLowerCase()) != -1 ? "success" : "primary");
              let newUnits = cocktailData.ingredients[key].split(" ");
              newUnits[0] *= this.ingredientMultiplier;
              let displayIngr = ``;
              newUnits.forEach((ing) => {
                displayIngr += ing;
                displayIngr += ` `;
              });
              ingredientsModal += `<li class="">${key}: ${displayIngr}</li>`;
              
              console.log(cocktailData.ingredients[key].split(" "));
            });
            $("#ingredients").html(ingredientsModal);

          
          }
          $(".dropdown-item").click(function(){
            let b = $(this).text();
            ChangePageHndler(b);
          });
    }

    checkAge() {
      var ofAge = localStorage.getItem("of-age");
      if (ofAge != null) {
        this.hideAlcoholic = (ofAge === "false");
        return new Promise((resolve, reject) => resolve(this.hideAlcoholic));
      } else {

        return new Promise((resolve, reject) => {
          $("#ageModal").modal('show');

          let ageResponse = (ofAge) => {
            localStorage.setItem("of-age", ofAge)
            this.hideAlcoholic = !ofAge;
            $("#ageModal").modal('hide');
            resolve(this.hideAlcoholic);
          };
  
          $("#over21").click(() => ageResponse(true));
          $("#under21").click(() => ageResponse(false));
        });
      }
    }
}

$(document).ready(() => {
    console.log("Loading Mixify...");
    
    $.getJSON("cocktails.json", (data) => {
        new Mixify(data);
    });
});
