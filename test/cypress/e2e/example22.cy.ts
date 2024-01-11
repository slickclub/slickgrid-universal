describe('Example 22 - Row Based Editing', () => {
  const fullTitles = [
    'Title',
    'Duration (days)',
    '% Complete',
    'Start',
    'Finish',
    'Effort Driven',
    'Actions',
  ];

  it('should display Example title', () => {
    cy.visit(`${Cypress.config('baseUrl')}/example22`);
    cy.get('h3').should('contain', 'Example 22 - Row Based Editing');
  });

  it('should have exact column titles on grid', () => {
    cy.get('.grid1')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
  });

  it('should render edit and delete buttons in the actions column', () => {
    cy.get('.slick-cell.l6.r6').each(($child) => {
      cy.wrap($child)
        .find('.action-btns--edit, .action-btns--delete')
        .should('have.length', 2);
    });
  });

  it('should only allow to toggle a single row into editmode on single mode', () => {
    cy.get('.action-btns--edit').first().click();
    cy.get('.action-btns--edit').eq(1).click();

    cy.get('.slick-row.slick-rbe-editmode').should('have.length', 1);
  });

  it('should allow to toggle a multiple rows into editmode on multiple mode', () => {
    cy.reload();
    cy.get('[data-test="single-multi-toggle"]').click();
    cy.get('.action-btns--edit').first().click();
    cy.get('.action-btns--edit').eq(1).click();
    cy.get('.action-btns--edit').eq(2).click();

    cy.get('.slick-row.slick-rbe-editmode').should('have.length', 3);
  });

  it('should not display editor in rows not being in editmode', () => {
    cy.reload();
    cy.get('.slick-cell.l2.r2').first().click();

    cy.get('input').should('have.length', 0);

    cy.get('.action-btns--edit').first().click();

    cy.get('.slick-cell.l2.r2').first().click();

    cy.get('input').should('have.length', 1);
  });

  it('should highlight modified cells and maintain proper index on sorting', () => {
    cy.reload();

    cy.get('.action-btns--edit').first().click();

    cy.get('.slick-cell.l0.r0').first().click().type('abc{enter}');
    cy.get('.slick-cell').first().should('have.class', 'slick-rbe-unsaved-cell');
    cy.get('[data-id="title"]').click();
    cy.get('.slick-cell').first().should('not.have.class', 'slick-rbe-unsaved-cell');
    cy.get('[data-id="title"]').click();
    cy.get('.slick-cell').first().should('have.class', 'slick-rbe-unsaved-cell');
  });

  it('should stay in editmode if saving failed', () => {
    cy.reload();

    cy.get('.action-btns--edit').first().click();

    cy.get('.slick-cell.l1.r1').first().click().type('50{enter}');
    cy.get('.slick-cell.l2.r2').first().click().type('50');

    cy.get('.action-btns--update').first().click();
    cy.on('window:confirm', () => true);
    cy.on('window:alert', (str) => {
      expect(str).to.equal('Sorry, 40 is the maximum allowed duration.');
    });

    cy.get('.slick-row.slick-rbe-editmode').should('have.length', 1);
  });

  it('should save changes on update button click', () => {
    cy.reload();

    cy.get('.action-btns--edit').first().click();

    cy.get('.slick-cell.l1.r1').first().click().type('30{enter}');
    cy.get('.slick-cell.l2.r2').first().click().type('30');

    cy.get('.action-btns--update').first().click();
    cy.on('window:alert', (str) => {
      expect(str).to.equal('success');
    });

    cy.get('.slick-cell.l1.r1').first().should('contain', '30');
    cy.get('.slick-cell.l2.r2').first().should('contain', '30');
  });

  it('should revert changes on cancel click', () => {
    cy.get('.action-btns--edit').first().click();

    cy.get('.slick-cell.l1.r1').first().click().type('50{enter}');
    cy.get('.slick-cell.l2.r2').first().click().type('50{enter}');

    cy.get('.action-btns--cancel').first().click();

    cy.get('.slick-cell.l1.r1').first().should('contain', '30');
    cy.get('.slick-cell.l2.r2').first().should('contain', '30');
  });

  it('should delete a row when clicking it', () => {
    cy.get('.action-btns--delete').first().click();

    cy.on('window:confirm', () => true);

    cy.get('.slick-row')
      .first()
      .find('.slick-cell.l0.r0')
      .should('contain', 'Task 1');
  });
});
