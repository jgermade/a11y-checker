describe('cy.checkA11y', () => {
  it('passes on an accessible page', () => {
    cy.visit('pages/good.html');
    cy.checkA11y().its('summary.outcomes.violation').should('equal', 0);
  });

  it('yields the result without failing when failOn is none', () => {
    cy.visit('pages/bad.html');
    cy.checkA11y({ failOn: 'none' }).then((result) => {
      expect(result.issues.map((issue) => issue.ruleId)).to.deep.equal([
        'button-name',
        'image-alt',
      ]);
    });
  });

  it('checks only the subject element', () => {
    cy.visit('pages/bad.html');
    cy.get('#ok').checkA11y();
  });

  it('applies failOn', () => {
    cy.visit('pages/contrast.html');
    cy.checkA11y({ failOn: 'critical' });
  });

  it('fails with the list of violations', () => {
    cy.on('fail', (error) => {
      expect(error.message).to.contain('Expected no accessibility violations, but found 2:');
      expect(error.message).to.contain('axe/image-alt');
      return false; // the failure is expected
    });
    cy.visit('pages/bad.html');
    cy.checkA11y();
  });
});
