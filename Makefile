.PHONY: synth test deploy install resume

synth:
	cd cdk && npm run synth
test:
	cd cdk && npm test
deploy:
	cd cdk && npm run deploy
install:
	cd cdk && npm ci
resume:
	cd resume && tectonic -o ../src resume.tex
