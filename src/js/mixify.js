class Mixify {
  constructor (cocktailDb) {
    firebase.initializeApp({
      apiKey: 'AIzaSyAWKzPYvMvAW-Bh3caJXlqn9Axn_F9_bZ8',
      authDomain: 'mixify-88b9c.firebaseapp.com',
      databaseURL: 'https://mixify-88b9c.firebaseio.com',
      projectId: 'mixify-88b9c',
      storageBucket: 'mixify-88b9c.appspot.com',
      messagingSenderId: '167156542489',
      appId: '1:167156542489:web:2efd4b1dca6a3224'
    });

    var uiConfig = {
      signInFlow: 'popup',
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID
      ],
      credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
      callbacks: {
        signInSuccess: (currentUser, credential, redirectUrl) => {
          this.loggedIn = true;
          this.user = currentUser;
          const userDataDocRef = this.db.collection('users').doc(this.user.uid);
          userDataDocRef.get().then((dataDoc) => {
            if (dataDoc.exists) {
              this.userData = dataDoc.data();
              this.generateCards();
              this.displayCards();
            } else {
              userDataDocRef.set({
                favorites: []
              }).then((data) => {
                this.userData = {
                  favorites: []
                };
                this.generateCards();
                this.displayCards();
              });
            }
          });
          return false;
        }
      }
    };

    var ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start('#firebaseui-auth-container', uiConfig);
    this.db = firebase.firestore();

    this.cocktailDb = cocktailDb;
    this.outputH = [];
    this.pgNum1 = 1;
    this.displayNum = 15;
    this.start = 0;
    this.end = this.start + this.displayNum;
    this.ingredientMultiplier = 1;
    this.ingredientUnit = 'Metric';

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

  toggleFavorite (cocktailId) {
    if (!this.loggedIn) return alert('Please login to favorite drinks.');

    cocktailId = parseInt(cocktailId);
    const userDataDocRef = this.db.collection('users').doc(this.user.uid);
    var operation = firebase.firestore.FieldValue.arrayUnion(cocktailId);
    if (this.isFavorite(cocktailId)) {
      operation = firebase.firestore.FieldValue.arrayRemove(cocktailId);
    }

    userDataDocRef.update({
      favorites: operation
    }).then(() => {
      userDataDocRef.get().then((dataDoc) => {
        this.userData = dataDoc.data();
        this.generateCards();
        this.displayCards();
      });
    });
  }

  isFavorite (cocktailId) {
    return this.userData && this.userData.favorites.indexOf(parseInt(cocktailId)) != -1;
  }

  isNonAlcoholic (cocktail) {
    if (cocktail.alcoholic == null) return false;
    return cocktail.alcoholic.toLowerCase() == 'non alcoholic' || cocktail.alcoholic.toLowerCase() == 'optional alcohol';
  }

  // Sets up the search bar tagging stuff
  initializeSearchBar () {
    var ingredientNames = new Bloodhound({
      local: this.cocktailDb.ingredients,
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      datumTokenizer: Bloodhound.tokenizers.whitespace
    });
    ingredientNames.initialize();

    // bootstrap tags input has a terrible API that doesn't seem
    // to play nicely with jQuery anymore. Targeting it like
    // this isn't ideal, but we're gonna live with it for now.
    this.searchIngredients = $('input[type="text"]').tagsinput({
      typeaheadjs: {
        source: ingredientNames
      }
    })[0];

    $('input[type="text"]').on('beforeItemAdd', (event) => {
      // Cancel the item add if the ingredient the user is trying to add
      // does not exists in our ingredient database.
      event.cancel = this.cocktailDb.ingredients.indexOf(event.item.replace(/\!/g, '')) == -1;
    });

    let tagInputChangeEventHandler = (event) => {
      if (event.tag !== undefined) {
        // Item is added
        $(event.tag).click((tagClick) => {
          console.log(tagClick);
          // When a tag is clicked, let's negate that tag
          // so that the search doesn't include that tag.
          if (event.item[0] == '!') {
            this.searchIngredients.remove(event.item);
            this.searchIngredients.add(`${event.item.substr(1)}`);
          } else {
            this.searchIngredients.remove(event.item);
            this.searchIngredients.add(`!${event.item}`);
          }
        }).children().on('click', (e) => {
          e.stopPropagation();
          this.searchIngredients.remove(event.item);
        });
      }

      this.filterCards();
      this.sortCards();
      this.nextPage(1);
      this.generateCards();
      this.displayCards();
    };

    $('input[type="text"]').on('itemAdded', tagInputChangeEventHandler);
    $('input[type="text"]').on('itemRemoved', tagInputChangeEventHandler);

    $('#favCheck').change((event) => {
      if (!this.loggedIn) {
        alert('You must be logged in to view favorited drinks.');
        event.target.checked = false;
        return;
      }
      this.onlyFavorites = event.target.checked;
      this.filterCards();
      this.sortCards();
      this.nextPage(1);
      this.generateCards();
      this.displayCards();
    });
  }

  get selectedIngredients () {
    return this.searchIngredients.itemsArray.map((ingr) => ingr.toLowerCase());
  }

  filterCards () {
    const selectedIngredients = this.selectedIngredients;
    const negatedIngredients = selectedIngredients.filter((ingr) => ingr[0] == '!').map((ingr) => ingr.substr(1).toLowerCase());
    if (selectedIngredients.length - negatedIngredients.length <= 0) {
      console.log('a');
      this.filteredCocktails = this.defaultCocktails.slice().filter((cocktail) => {
        // Remove any cocktails that include negated ingredients
        let includesNegated = false;
        Object.keys(cocktail.ingredients).forEach((ingr) => {
          if (negatedIngredients.indexOf(ingr.toLowerCase()) != -1) includesNegated = true;
        });
        return !includesNegated;
      }).filter((cocktail) => {
        if (!this.loggedIn) return true;
        if (!this.onlyFavorites) return true;
        if (!this.isFavorite(cocktail.id)) return false;
        return true;
      });
    } else {
      console.log('b');
      this.filteredCocktails = Object.values(this.cocktailDb.cocktails).filter((cocktail) => {
        // Remove any cocktails that include negated ingredients
        let includesNegated = false;
        Object.keys(cocktail.ingredients).forEach((ingr) => {
          if (negatedIngredients.indexOf(ingr.toLowerCase()) != -1) includesNegated = true;
        });
        return !includesNegated;
      }).filter((cocktail) => {
        if (this.isNonAlcoholic(cocktail) === false && this.hideAlcoholic) return false;
        return selectedIngredients.some((ingredient) =>
          Object.keys(cocktail.ingredients).map((ingr) => ingr.toLowerCase()).includes(ingredient));
      }).filter((cocktail) => {
        if (!this.loggedIn) return true;
        if (!this.onlyFavorites) return true;
        if (!this.isFavorite(cocktail.id)) return false;
        return true;
      });
    }
  }

  sortCards () {
    // https://stackoverflow.com/a/52430020/826371
    let arrayDiff = (a, b) => {
      return [
        ...a.filter(x => b.indexOf(x) === -1),
        ...b.filter(x => a.indexOf(x) === -1)
      ];
    };

    const numIngredientsRequired = (cocktail) => {
      let ingredientList = Object.keys(cocktail.ingredients).map((val) => val.toLowerCase());
      let selectedList = this.selectedIngredients.map((val) => val.toLowerCase()).filter((ingr) => ingr[0] != '!');

      const diff = arrayDiff(ingredientList, selectedList);

      return diff.length;
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
  generateCards () {
    this.outputH = [];
    this.outputH[0] = `<div class="container"><div class="card-columns">`;
    if (this.end > this.filteredCocktails.length) {
      this.end = this.filteredCocktails.length;
    } else if (this.end <= 0) {
      this.end += this.displayNum;
    }
    if (this.start < 0) {
      this.start = 0;
    } else if (this.start >= this.filteredCocktails.length) {
      this.start -= this.displayNum;
    }
    console.log(this.filteredCocktails);
    console.log(this.start);
    console.log(this.end);
    for (let i = this.start; i < this.end; i++) {
      let cocktailData = this.filteredCocktails[i];
      let outputHtml = ``;
      let ingredientHtml = ``;

      const hasIngredient = (name) => {
        return this.selectedIngredients.indexOf(name.toLowerCase()) != -1;
      };

      if (cocktailData == undefined) continue;

      let cocktailIngredients = Object.keys(cocktailData.ingredients).sort((a, b) => {
        if (hasIngredient(a) && !hasIngredient(b)) return -1;
        if (hasIngredient(b) && !hasIngredient(a)) return 1;
        return 0;
      });

      cocktailIngredients.forEach((key) => {
        let hasIngredientClass = (hasIngredient(key) ? 'success' : 'primary');
        ingredientHtml += `<span class="badge badge-${hasIngredientClass} m-1" id="tagButton">${key}</span>`;
      });
      let alcoholClass = 0;
      if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Optional') != -1) {
        alcoholClass = 'warning';
      } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Non') != -1) {
        alcoholClass = 'danger';
      } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Alcoholic') != -1) {
        alcoholClass = 'success';
      }

      outputHtml += `<div class="card mb-4 mt-2 flex-fill shadow" id="${i}">
            <i class="${this.isFavorite(cocktailData.id) ? 'fas' : 'far'} fa-heart" id="fav-${cocktailData.id}"></i>
            <img class="bd-placeholder-img card-img-top flex-fill" data.drinkid="${i}" src="${cocktailData.thumbnail}" focusable="false" role="img" aria-label="Placeholder: Thumbnail"></img>
            ${alcoholClass == 0 ? `<span class="badge badge-secondary alcoholic-tag">Unknown</span>` : `<span class="badge badge-${alcoholClass} alcoholic-tag">${cocktailData.alcoholic}</span>`}
            <div class="card-body" data.drinkid="${i}">
            <p>${cocktailData.name}</p>
            <div>
              ${ingredientHtml}
            </div>
            </div>
            </div>`;

      this.outputH.push(outputHtml);
    }
  }

  displayCards () {
    let displayHtml = this.outputH[0];

    for (let i = 1; i < this.outputH.length; i++) {
      displayHtml += this.outputH[i];
    }

    $('#cocktailAlbum').html(displayHtml);
    let ChangeModalHndler = (b) => {
      this.displayModal(b);
    };

    $('.card-img-top, .card-body').click(function (event) {
      let b = $(this).attr('data.drinkid');
      ChangeModalHndler(b);
      $('#mod').modal('toggle');
    });

    $('.fa-heart').click((event) => {
      this.toggleFavorite($(event.target).attr('id').replace('fav-', ''));
    });

    $('.badge-primary').click((event) => {
      var key = $(event.target).text();

      var ingredientName = key;
      this.searchIngredients.add(ingredientName);

      this.filterCards();
      this.sortCards();
      this.nextPage(1);
      this.generateCards();
      this.displayCards();
    });
  }
  nextPage (pgNum) {
    // calculates the max page number
    let maxPg = Math.round(this.filteredCocktails.length / this.displayNum);
    if (maxPg - this.filteredCocktails.length / this.displayNum < 0) {
      maxPg += 1;
    }
    // checks argument, if negative then its either pg next, back pg,
    // or last pg
    if (pgNum == -1) {
      this.pgNum1 += 1;
    } else if (pgNum == -2) {
      this.pgNum1 -= 1;
    } else if (pgNum == -3) {
      this.pgNum1 = maxPg;
    } else {
      this.pgNum1 = pgNum;
    }
    // checks to see if pg number will be out of bounds
    if (this.pgNum1 > maxPg) {
      this.pgNum1 = maxPg;
    } else if (this.pgNum1 < 1) {
      this.pgNum1 = 1;
    }
    // sets the values for displayCards to use
    this.end = this.displayNum * this.pgNum1;
    this.start = this.end - this.displayNum;

    this.generateCards();
    this.displayCards();
    this.changePagination();
  }
  // changes the page numbers and also makes sure that it displays the real page number
  changePagination () {
    let numTabs = this.filteredCocktails.length / this.displayNum;
    let displayHtml = `<li class="page-item"><a class="page-link" href="#">&lt</a></li>
                         <li class="page-item"><a class="page-link" href="#">Back</a></li>`;
    if (numTabs - Math.round(numTabs) > 0) {
      numTabs = Math.round(numTabs) + 1;
    } else {
      numTabs = Math.round(numTabs);
    }
    let i = this.pgNum1;
    if (i < 3) {
      i = 1;
    } else {
      i -= 2;
    }
    let stop = i + 4;
    if (stop > numTabs) {
      stop = numTabs;
      i = numTabs - 4;
      if (i < 1) {
        i = 1;
      }
    }
    for (i; i <= stop; i++) {
      displayHtml += `<li class="page-item"><a class="page-link" href="#">${i}</a></li>`;
    }
    displayHtml += `<li class="page-item"><a class="page-link" href="#">Next</a></li>
                      <li class="page-item"><a class="page-link" href="#">&gt</a></li>`;
    $('#paginationHtml').html(displayHtml);
    // this handles the conditions of a pg number getting clicked
    let ChangePageHndler = (b) => {
      this.nextPage(b);
    };
    $('.page-item').click(function () {
      let b = $(this).text();
      if (b == 'Next') {
        b = -1;
      } else if (b == 'Back') {
        b = -2;
      } else if (b == '<') {
        b = 1;
      } else if (b == '>') {
        b = -3;
      }
      ChangePageHndler(b);
    });
  }
  displayModal (mid) {
    this.ingredientMultiplier = 1;
    let cocktailData = this.filteredCocktails[mid];
    let alcoholClass = 0;
    if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Optional') != -1) {
      alcoholClass = 'warning';
    } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Non') != -1) {
      alcoholClass = 'danger';
    } else if (cocktailData.alcoholic && cocktailData.alcoholic.indexOf('Alcoholic') != -1) {
      alcoholClass = 'success';
    }
    let outputModal = `<div class="modal fade" id="mod" tabindex="-1" role="dialog" aria-labelledby="exampleModalLongTitle" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
              <div class="modal-content">
                <div class="modal-header">
                    <div class="container">
                      <div class="row">
                        <div class="col">
                            <h5 class="modal-title">${cocktailData.name}<span class="badge badge-`;
    if (alcoholClass == 0) {
      // OUTPUT MODAL
      outputModal += `secondary ml-3"">Unknown</span>`;
    } else {
      // OUTPUT MODAL
      outputModal += `${alcoholClass} ml-3">${cocktailData.alcoholic}</span>`;
    }
    let options = ``;
    for (let j = 0; j < 100; ++j) {
      options += `<a class="dropdown-item num" href="#">${j + 1}</a>`;
    }
    // OUTPUT MODAL
    outputModal += `</h5>
                    </div>
                    <div class="col-1 mr-3">
                        
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
                    <div class="row">
                      <div class="col">
                          <img class="bd-placeholder-img card-img-top" src="${cocktailData.thumbnail}" focusable="false" role="img" aria-label="Placeholder: Thumbnail"></img>
                      </div>
                      <div class="col">
                      <div class="btn-group float-right">
                      <button type="button" class="btn btn-sm btn-secondary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                      Quantity: <span id="quanNum" class="mr-1 ml-1">${this.ingredientMultiplier}</span>  
                      <span class="sr-only">Toggle Dropdown</span>
                      </button>
                      <div class="dropdown-menu scrollable-menu w-1">
                      ${options}
                      </div>
                    </div>
                        <h5>List of ingredients: </h5>
                        <div id="ingredients">
                        </div>
                        <h5>Instructions:</h5>
                        ${cocktailData.instructions}
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>`;
    $('#displayModal1').html(outputModal);
    this.ingredientsManipulations(cocktailData);
    let ChangePageHndler = (b) => {
      this.ingredientMultiplier = b;
      this.ingredientsManipulations(cocktailData);
    };
    $('.num').click(function () {
      let b = $(this).text();
      ChangePageHndler(b);
    });
  }
  ingredientsManipulations (cocktailData) {
    $('#quanNum').html(this.ingredientMultiplier);
    let ingredientsModal = `<div class="ingredients"><ul>`;
    Object.keys(cocktailData.ingredients).forEach((key) => {
      let hasIngredientClass = (this.selectedIngredients.indexOf(key.toLowerCase()) != -1 ? 'success' : 'primary');
      let newUnits;
      let displayIngr = ` `;
      if (cocktailData.ingredients[key]) {
        newUnits = cocktailData.ingredients[key].split(' ');
        for (let s = 0; s < newUnits.length; ++s) {
          //  console.log(newUnits);
          let ing = newUnits[s];
          let temp = 0;
          if (newUnits.length > s + 1 && !isNaN(ing)) {
            if (newUnits[s + 1].includes('/')) {
              // console.log("passed here");
              temp = newUnits[s] * this.ingredientMultiplier;
              ing = newUnits[s + 1];
              s += 1;
            }
          }
          if (!isNaN(ing)) {
            ing *= this.ingredientMultiplier;
          } else if (ing == `½`) {
            // ing = (1*this.ingredientMultiplier)+`/`+2;
            let wNum = math.divide(1 * this.ingredientMultiplier, 2);
            wNum = math.floor(wNum);
            if (wNum == 0) {
              wNum = ` `;
            }
            let numer = math.mod(1 * this.ingredientMultiplier, 2);
            if (numer == 0) {
              ing = wNum;
            } else {
              ing = wNum + ` ` + numer + `/` + ing1[1];
            }
          } else if (ing.includes('/')) {
            let ing1 = ing.split('/');
            ing1[0] *= this.ingredientMultiplier;
            let wNum = math.divide(ing1[0], ing1[1]);
            wNum = math.floor(wNum);
            // console.log("temp = ", temp);
            // console.log("wNum = ", wNum);
            wNum = math.add(temp, wNum);
            // console.log("wNum = ", wNum);
            if (wNum == 0) {
              wNum = ` `;
            }
            let numer = math.mod(ing1[0], ing1[1]);
            if (numer == 0) {
              ing = wNum;
            } else {
              ing = wNum + ` ` + numer + `/` + ing1[1];
            }
          } else if (ing.includes('-')) {
            let ing1 = ing.split('-');
            ing = (ing1[0] * this.ingredientMultiplier) + `-` + (ing1[1] * this.ingredientMultiplier);
          }
          displayIngr += ing;
          displayIngr += ` `;
        }
        // newUnits.forEach((ing) => {

        // });
      }
      ingredientsModal += `<li class="">${key}: ${displayIngr}</li>`;
    });
    ingredientsModal += `</div></ul>`;
    $('#ingredients').html(ingredientsModal);
  }
  checkAge () {
    var ofAge = localStorage.getItem('of-age');
    if (ofAge != null) {
      this.hideAlcoholic = (ofAge === 'false');
      return new Promise((resolve, reject) => resolve(this.hideAlcoholic));
    } else {
      return new Promise((resolve, reject) => {
        $('#ageModal').modal('show');

        let ageResponse = (ofAge) => {
          localStorage.setItem('of-age', ofAge);
          this.hideAlcoholic = !ofAge;
          $('#ageModal').modal('hide');
          resolve(this.hideAlcoholic);
        };

        $('#over21').click(() => ageResponse(true));
        $('#under21').click(() => ageResponse(false));
      });
    }
  }
}

$(document).ready(() => {
  console.log('Loading Mixify...');

  $.getJSON('cocktails.json', (data) => {
    const mix = new Mixify(data);
    document.mixify = mix;
  });
});
